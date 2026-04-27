import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import { Account } from '../accounts/account.schema';
import { Category } from '../categories/category.schema';
import { CategoryType, JwtUser } from '../common/types';
import { User } from '../users/user.schema';
import { ForgotPasswordDto, LoginDto, ResetPasswordDto, SignupDto, VerifyEmailDto } from './dto/auth.dto';

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(Account.name) private readonly accounts: Model<Account>,
    @InjectModel(Category.name) private readonly categories: Model<Category>,
    private readonly jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.users.findOne({ email });
    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    const verificationToken = this.generateToken();
    const verificationExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    const user = await this.users.create({
      name: dto.name,
      email,
      phone: dto.phone,
      password: await bcrypt.hash(dto.password, 10),
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: verificationExpiresAt,
      authProvider: 'LOCAL',
    });

    await this.bootstrapWorkspace(user._id.toString());

    let message: string | undefined;
    let emailDeliveryFailed = false;

    if (this.isMailConfigured()) {
      try {
        await this.sendVerificationEmailIfConfigured(user.email, user.name, verificationToken);
        message = 'Verification email sent. Please check your inbox.';
      } catch (error) {
        emailDeliveryFailed = true;
        message = 'Account created, but verification email could not be sent right now.';
        this.logger.warn(
          `Verification email failed for ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return {
      ...this.authPayload(user),
      emailDeliveryFailed,
      message,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ email: dto.email.toLowerCase() });
    if (!user || !user.isActive || !user.password || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.authPayload(user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    this.ensureMailConfigured();

    const user = await this.users.findOne({ email: dto.email.toLowerCase(), isActive: true });
    if (!user) {
      throw new NotFoundException('No active account found for this email');
    }

    const resetToken = this.generateToken();
    const passwordResetExpiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await this.users.findByIdAndUpdate(user._id, {
      passwordResetToken: resetToken,
      passwordResetExpiresAt,
    });

    await this.sendPasswordResetEmail(user.email, user.name, resetToken);

    return {
      success: true,
      expiresAt: passwordResetExpiresAt,
      message: 'Password reset link sent. Please check your email.',
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.users.findOne({
      emailVerificationToken: dto.token,
      emailVerificationExpiresAt: { $gt: new Date() },
      isActive: true,
    });

    if (!user) {
      throw new BadRequestException('Verification link is invalid or expired');
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    return {
      success: true,
      message: 'Email verified successfully. You can continue using your account.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.users.findOne({
      email: dto.email.toLowerCase(),
      passwordResetToken: dto.resetToken,
      passwordResetExpiresAt: { $gt: new Date() },
      isActive: true,
    });

    if (!user) {
      throw new BadRequestException('Reset link is invalid or expired');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpiresAt = undefined;
    if (!user.authProvider) {
      user.authProvider = 'LOCAL';
    }
    await user.save();

    return this.authPayload(user);
  }

  buildGoogleStartUrl(returnTo: string) {
    const normalizedReturnTo = this.normalizeReturnTo(returnTo);
    const redirectUri = this.getGoogleRedirectUri();
    const clientId = this.getGoogleClientId();

    if (!clientId || !redirectUri) {
      throw new ServiceUnavailableException('Google sign-in is not configured yet');
    }

    const state = this.jwt.sign(
      {
        purpose: 'google-auth',
        returnTo: normalizedReturnTo,
      },
      { expiresIn: '10m' },
    );

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleGoogleCallback(input: { code?: string; state?: string; error?: string }) {
    const returnTo = this.getReturnToFromState(input.state);

    if (input.error) {
      return this.buildRedirectUrl(returnTo, { error: 'Google sign-in was cancelled or denied.' });
    }

    if (!input.code) {
      return this.buildRedirectUrl(returnTo, { error: 'Google did not return an authorization code.' });
    }

    try {
      const googleProfile = await this.fetchGoogleProfile(input.code);
      if (!googleProfile.email || !googleProfile.sub || !googleProfile.email_verified) {
        throw new BadRequestException('Google account email could not be verified');
      }

      let user = await this.users.findOne({ email: googleProfile.email.toLowerCase() });
      if (!user) {
        user = await this.users.create({
          name: googleProfile.name || this.displayNameFromEmail(googleProfile.email),
          email: googleProfile.email.toLowerCase(),
          emailVerified: true,
          googleId: googleProfile.sub,
          authProvider: 'GOOGLE',
          password: '',
        });
        await this.bootstrapWorkspace(user._id.toString());
      } else {
        if (!user.isActive) {
          throw new UnauthorizedException('This account is inactive');
        }

        user.googleId = googleProfile.sub;
        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpiresAt = undefined;
        if (!user.name) {
          user.name = googleProfile.name || this.displayNameFromEmail(googleProfile.email);
        }
        if (!user.authProvider) {
          user.authProvider = 'GOOGLE';
        }
        await user.save();
      }

      const payload = this.authPayload(user);
      return this.buildRedirectUrl(returnTo, {
        accessToken: payload.accessToken,
        sub: payload.user.sub,
        email: payload.user.email,
        name: payload.user.name,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed';
      return this.buildRedirectUrl(returnTo, { error: message });
    }
  }

  me(user: JwtUser) {
    return user;
  }

  private isMailConfigured() {
    return Boolean(this.getMailFrom() && this.getSmtpHost() && this.getSmtpPort() && this.getSmtpUser() && this.getSmtpPass());
  }

  private ensureMailConfigured() {
    if (!this.isMailConfigured()) {
      throw new ServiceUnavailableException('Email service is not configured yet');
    }
  }

  private getWebAppUrl() {
    return process.env.APP_PUBLIC_WEB_URL?.trim().replace(/\/+$/, '') || 'http://localhost:3000';
  }

  private getAllowedWebOrigins() {
    const values = [process.env.APP_PUBLIC_WEB_URL, process.env.APP_PUBLIC_WEB_URLS, process.env.CORS_ORIGIN];
    const origins = new Set<string>();

    for (const value of values) {
      if (!value) {
        continue;
      }

      for (const part of value.split(',')) {
        const trimmed = part.trim().replace(/\/+$/, '');
        if (!trimmed || trimmed === '*') {
          continue;
        }

        try {
          const url = new URL(trimmed);
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            origins.add(url.origin);
          }
        } catch {
          // Ignore invalid origins from env.
        }
      }
    }

    return origins;
  }

  private getGoogleClientId() {
    return process.env.GOOGLE_CLIENT_ID?.trim();
  }

  private getGoogleClientSecret() {
    return process.env.GOOGLE_CLIENT_SECRET?.trim();
  }

  private getGoogleRedirectUri() {
    return process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  }

  private getSmtpHost() {
    return process.env.SMTP_HOST?.trim();
  }

  private getSmtpPort() {
    const value = process.env.SMTP_PORT?.trim();
    if (!value) {
      return undefined;
    }

    const port = Number(value);
    return Number.isFinite(port) ? port : undefined;
  }

  private getSmtpSecure() {
    return (process.env.SMTP_SECURE?.trim().toLowerCase() || 'true') === 'true';
  }

  private getSmtpUser() {
    return process.env.SMTP_USER?.trim();
  }

  private getSmtpPass() {
    return process.env.SMTP_PASS?.replace(/\s+/g, '').trim();
  }

  private getMailFrom() {
    return process.env.MAIL_FROM?.trim();
  }

  private generateToken() {
    return randomBytes(24).toString('hex');
  }

  private displayNameFromEmail(email: string) {
    const localPart = email.split('@')[0] ?? 'User';
    const cleaned = localPart.replace(/[._-]+/g, ' ').trim();
    if (!cleaned) {
      return 'User';
    }

    return cleaned
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private normalizeReturnTo(returnTo: string) {
    if (!returnTo) {
      throw new BadRequestException('Missing returnTo URL');
    }

    const trimmed = returnTo.trim();
    const appPrefixes = ['exp://', 'exps://', 'expensetracker://', 'https://auth.expo.io/'];

    if (appPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
      return trimmed;
    }

    try {
      const url = new URL(trimmed);
      if ((url.protocol === 'http:' || url.protocol === 'https:') && this.getAllowedWebOrigins().has(url.origin)) {
        return trimmed;
      }
    } catch {
      // Invalid URL will be rejected below.
    }

    throw new BadRequestException('Unsupported returnTo URL');
  }

  private getReturnToFromState(state?: string) {
    if (!state) {
      throw new BadRequestException('Missing Google auth state');
    }

    const payload = this.jwt.verify<{ purpose: string; returnTo: string }>(state);
    if (payload.purpose !== 'google-auth' || !payload.returnTo) {
      throw new BadRequestException('Invalid Google auth state');
    }

    return this.normalizeReturnTo(payload.returnTo);
  }

  private buildRedirectUrl(returnTo: string, params: Record<string, string>) {
    const url = new URL(returnTo);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  private async fetchGoogleProfile(code: string) {
    const clientId = this.getGoogleClientId();
    const clientSecret = this.getGoogleClientSecret();
    const redirectUri = this.getGoogleRedirectUri();

    if (!clientId || !clientSecret || !redirectUri) {
      throw new ServiceUnavailableException('Google sign-in is not configured yet');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = (await tokenResponse.json()) as GoogleTokenResponse;
    if (!tokenResponse.ok || !tokens.access_token) {
      throw new BadRequestException(tokens.error_description || tokens.error || 'Could not exchange Google code');
    }

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const profile = (await profileResponse.json()) as GoogleUserInfo;
    if (!profileResponse.ok) {
      throw new BadRequestException('Could not load Google profile');
    }

    return profile;
  }

  private async sendVerificationEmailIfConfigured(email: string, name: string, token: string) {
    if (!this.isMailConfigured()) {
      return;
    }

    const verifyUrl = `${this.getWebAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;
    await this.sendEmail({
      to: email,
      subject: 'Verify your email',
      html: `
        <div style="font-family: Arial, sans-serif; color: #102033; line-height: 1.6;">
          <h2 style="margin-bottom: 8px;">Verify your email</h2>
          <p>Hello ${this.escapeHtml(name)},</p>
          <p>Thanks for creating your account. Confirm your email by clicking the button below.</p>
          <p style="margin: 24px 0;">
            <a href="${verifyUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #1d4ed8; color: #ffffff; text-decoration: none; font-weight: 700;">
              Verify email
            </a>
          </p>
          <p>If the button does not work, open this link:</p>
          <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        </div>
      `,
      text: `Hello ${name}, verify your email: ${verifyUrl}`,
    });
  }

  private async sendPasswordResetEmail(email: string, name: string, token: string) {
    const resetUrl = `${this.getWebAppUrl()}/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

    await this.sendEmail({
      to: email,
      subject: 'Reset your password',
      html: `
        <div style="font-family: Arial, sans-serif; color: #102033; line-height: 1.6;">
          <h2 style="margin-bottom: 8px;">Reset your password</h2>
          <p>Hello ${this.escapeHtml(name)},</p>
          <p>We received a request to reset your password. Use the button below to continue.</p>
          <p style="margin: 24px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #1d4ed8; color: #ffffff; text-decoration: none; font-weight: 700;">
              Reset password
            </a>
          </p>
          <p>This link will expire in 30 minutes.</p>
          <p>If the button does not work, open this link:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
        </div>
      `,
      text: `Hello ${name}, reset your password: ${resetUrl}`,
    });
  }

  private async sendEmail(input: { to: string; subject: string; html: string; text: string }) {
    const host = this.getSmtpHost();
    const port = this.getSmtpPort();
    const user = this.getSmtpUser();
    const pass = this.getSmtpPass();
    const from = this.getMailFrom();

    if (!host || !port || !user || !pass || !from) {
      throw new ServiceUnavailableException('Email service is not configured yet');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: this.getSmtpSecure(),
      auth: {
        user,
        pass,
      },
    });

    try {
      await transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Email send failed';
      throw new ServiceUnavailableException(message || 'Email send failed');
    }
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async bootstrapWorkspace(userId: string) {
    await this.accounts.create({
      name: 'Main Wallet',
      details: 'Personal cash balance',
      initialBalance: 0,
      currentBalance: 0,
      userId,
    });

    await this.categories.insertMany([
      { name: 'Salary', type: CategoryType.INCOME, userId },
      { name: 'Freelance', type: CategoryType.INCOME, userId },
      { name: 'Business', type: CategoryType.INCOME, userId },
      { name: 'Food', type: CategoryType.EXPENSE, userId },
      { name: 'Transport', type: CategoryType.EXPENSE, userId },
      { name: 'Bills', type: CategoryType.EXPENSE, userId },
      { name: 'Shopping', type: CategoryType.EXPENSE, userId },
    ]);
  }

  private authPayload(user: User) {
    const payload: JwtUser = {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    return {
      accessToken: this.jwt.sign(payload),
      user: payload,
    };
  }
}
