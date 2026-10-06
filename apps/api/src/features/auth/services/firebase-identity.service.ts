import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '../../../shared/enums/roles.enum';
import { decode, JwtPayload, verify } from 'jsonwebtoken';

const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

interface FirebaseClaims extends JwtPayload {
  user_id?: string;
  email?: string;
  email_verified?: boolean;
}

interface FirestoreField {
  stringValue?: string;
  integerValue?: string;
  booleanValue?: boolean;
}

export interface FirebaseProfile {
  uid: string;
  email: string;
  fullName: string;
  role: Role;
  status: string;
  phone?: string;
  avatarUrl?: string;
  gradeLevel?: number;
}

@Injectable()
export class FirebaseIdentityService {
  private cachedCertificates: Record<string, string> = {};
  private certificatesExpireAt = 0;

  constructor(private readonly configService: ConfigService) {}

  async verifyAndReadProfile(idToken: string): Promise<FirebaseProfile> {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID')?.trim();
    if (!projectId) {
      throw new ServiceUnavailableException('Firebase identity verification is not configured');
    }

    const decoded = decode(idToken, { complete: true });
    if (!decoded || decoded.header.alg !== 'RS256' || !decoded.header.kid) {
      throw new UnauthorizedException('Invalid Firebase identity token');
    }

    const untrustedClaims = decoded.payload as FirebaseClaims;
    if (
      untrustedClaims.aud !== projectId ||
      untrustedClaims.iss !== `https://securetoken.google.com/${projectId}`
    ) {
      throw new UnauthorizedException('Firebase identity token is for another project');
    }

    const certificate = await this.getCertificate(decoded.header.kid);
    let claims: FirebaseClaims;
    try {
      claims = verify(idToken, certificate, {
        algorithms: ['RS256'],
        audience: projectId,
        issuer: `https://securetoken.google.com/${projectId}`,
      }) as FirebaseClaims;
    } catch {
      throw new UnauthorizedException('Firebase identity token is invalid or expired');
    }

    const uid = claims.user_id || claims.sub;
    const email = claims.email?.trim().toLowerCase();
    if (!uid || !email || claims.email_verified !== true) {
      throw new UnauthorizedException('A verified Firebase account is required');
    }

    const documentUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
    let response: Response;
    try {
      response = await fetch(documentUrl, {
        headers: { Authorization: `Bearer ${idToken}` },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new ServiceUnavailableException('Could not verify the Nexus account profile');
    }

    if (response.status === 404) {
      throw new UnauthorizedException('Nexus account profile is not provisioned');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException('Could not verify the Nexus account profile');
    }

    const document = (await response.json()) as { fields?: Record<string, FirestoreField> };
    const fields = document.fields ?? {};
    const profileEmail = fields.email?.stringValue?.trim().toLowerCase();
    const roleName = fields.role?.stringValue?.trim().toUpperCase();
    const role = Object.values(Role).find((knownRole) => String(knownRole) === roleName);
    const status = fields.status?.stringValue?.trim().toLowerCase() ?? '';
    const fullName = fields.full_name?.stringValue?.trim();

    if (!role || !profileEmail || profileEmail !== email || !fullName || !status) {
      throw new UnauthorizedException('Nexus account profile is invalid');
    }
    if (!['active', 'pending'].includes(status)) {
      throw new UnauthorizedException('Nexus account is disabled');
    }

    const gradeLevelValue = fields.gradeLevel?.integerValue;
    const gradeLevel = gradeLevelValue === undefined ? undefined : Number(gradeLevelValue);

    return {
      uid,
      email,
      fullName: fullName.slice(0, 120),
      role,
      status,
      ...(fields.phone?.stringValue ? { phone: fields.phone.stringValue.slice(0, 40) } : {}),
      ...(fields.avatar_url?.stringValue ? { avatarUrl: fields.avatar_url.stringValue.slice(0, 2048) } : {}),
      ...(Number.isInteger(gradeLevel) && gradeLevel >= 0 && gradeLevel <= 12
        ? { gradeLevel }
        : {}),
    };
  }

  private async getCertificate(keyId: string): Promise<string> {
    if (this.certificatesExpireAt <= Date.now()) {
      let response: Response;
      try {
        response = await fetch(FIREBASE_CERTS_URL, { signal: AbortSignal.timeout(5000) });
      } catch {
        throw new ServiceUnavailableException('Firebase signing certificates are unavailable');
      }
      if (!response.ok) {
        throw new ServiceUnavailableException('Firebase signing certificates are unavailable');
      }

      const certificates = (await response.json()) as Record<string, string>;
      const cacheControl = response.headers.get('cache-control') ?? '';
      const maxAge = Number(cacheControl.match(/max-age=(\d+)/i)?.[1] ?? 300);
      this.cachedCertificates = certificates;
      this.certificatesExpireAt = Date.now() + Math.min(Math.max(maxAge, 60), 3600) * 1000;
    }

    const certificate = this.cachedCertificates[keyId];
    if (!certificate) {
      this.certificatesExpireAt = 0;
      throw new UnauthorizedException('Unknown Firebase signing certificate');
    }
    return certificate;
  }
}
