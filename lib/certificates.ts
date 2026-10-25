// Verified certificates: codes, links and the printed verification block.
//
// Each certificate Magical Touch Design issues gets a random code such as
// MTD-7K3QD-X9P2A (about 49 bits — impossible to guess), stored in the
// certificate_issues table. The code and a QR code linking to
// /verify/<code> are printed on the certificate, so anyone holding it can
// check the name, title and date against our records in seconds.

import { qrMatrix } from '@/lib/qr';

export const VERIFY_ORIGIN = 'https://www.magicaltouchdesign.com';
// No 0/O, 1/I/L, U: nothing that can be misread when typed in by hand.
const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';

export function newCertificateCode() {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const ch = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  return `MTD-${ch.slice(0, 5)}-${ch.slice(5)}`;
}

export const normaliseCode = (s: string) => s.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9-]/g, '');
export const verifyUrl = (code: string) => `${VERIFY_ORIGIN}/verify/${encodeURIComponent(code)}`;

export interface IssuedCertificate {
  code: string;
  recipient: string;
  title: string;
  description?: string | null;
  issued_on: string;
  issuer?: string;
  status?: 'valid' | 'revoked';
  revoked_reason?: string | null;
}

// Text tokens a certificate master can contain; filled in when an issued
// certificate is opened in the editor.
export function certificateTokens(c: IssuedCertificate): Record<string, string> {
  const date = new Date(c.issued_on + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return {
    '{{recipient}}': c.recipient,
    '{{title}}': c.title,
    '{{description}}': c.description || '',
    '{{date}}': date,
    '{{code}}': c.code,
    '{{verify}}': `${VERIFY_ORIGIN.replace('https://', '')}/verify`,
  };
}

/**
 * Fabric objects for the verification block: a vector QR code on a white
 * tile, the code in monospace, and a line of microtext. The objects are
 * locked so the code can't be nudged or edited by accident.
 */
export function buildVerificationBlock(F: any, c: IssuedCertificate, at: { x: number; y: number; size: number }, ink = '#111111') {
  const m = qrMatrix(verifyUrl(c.code), 'M');
  const n = m.length, quiet = 2, cell = at.size / (n + quiet * 2);
  let d = '';
  m.forEach((row, y) => row.forEach((v, x) => { if (v) d += `M${(x + quiet) * cell} ${(y + quiet) * cell}h${cell}v${cell}h${-cell}z`; }));
  const lock = { selectable: true, lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, lockRotation: true, hasControls: false, locked: true } as any;
  const tile = new F.Rect({ left: at.x, top: at.y, width: at.size, height: at.size, fill: '#FFFFFF', rx: cell, ry: cell, name: 'Verification QR background', ...lock });
  const qr = new F.Path(d, { left: at.x, top: at.y, fill: ink, stroke: '', objectCaching: false, name: 'Verification QR code', ...lock });
  const fs = Math.max(7, at.size * 0.085);
  const code = new F.Textbox(c.code, { left: at.x - at.size * 0.25, top: at.y + at.size + fs * 0.5, width: at.size * 1.5, fontFamily: 'Space Mono', fontSize: fs, fontWeight: 700, fill: ink, textAlign: 'center', name: 'Certificate code', ...lock });
  const hint = new F.Textbox(`Verify at ${VERIFY_ORIGIN.replace('https://www.', '')}/verify`, { left: at.x - at.size * 0.4, top: at.y + at.size + fs * 1.9, width: at.size * 1.8, fontFamily: 'Space Mono', fontSize: fs * 0.72, fill: ink, opacity: 0.8, textAlign: 'center', name: 'Verification hint', ...lock });
  const microSize = Math.max(3, at.size * 0.022), microChars = Math.floor((at.size * 1.6) / (microSize * 0.62)) - 2;
  const micro = new F.Textbox(`${c.code} · ${c.recipient} · ${c.title} · `.toUpperCase().repeat(12).slice(0, microChars), { left: at.x - at.size * 0.3, top: at.y - microSize * 2, width: at.size * 1.6, fontFamily: 'Space Mono', fontSize: microSize, fill: ink, opacity: 0.55, textAlign: 'center', name: 'Security microtext', ...lock });
  [tile, qr, code, hint, micro].forEach((o: any) => (o.__certCode = c.code));
  return [micro, tile, qr, code, hint];
}

/** Replace {{tokens}} in a whole canvas JSON (for previews). */
export function fillCertificateJson(json: any, values: Partial<IssuedCertificate>) {
  const tokens = certificateTokens({ code: 'MTD-XXXXX-XXXXX', recipient: 'Recipient Name', title: 'Certificate title', issued_on: new Date().toISOString().slice(0, 10), ...values } as IssuedCertificate);
  let s = JSON.stringify(json);
  Object.entries(tokens).forEach(([k, v]) => { s = s.split(k).join(JSON.stringify(v).slice(1, -1)); });
  return JSON.parse(s);
}

/** Sample values used to preview a certificate master. */
export const SAMPLE_CERTIFICATE: Partial<IssuedCertificate> = { recipient: 'Aisha Rahman', title: 'Brand Design Workshop', description: '12-hour course · Dubai · November 2026', code: 'MTD-7K3QD-X9P2A' };
