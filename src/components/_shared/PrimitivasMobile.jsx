import React from 'react';
import { useTheme } from '../../theme';

export const PALETA = {
  blue:        '#5B9BD5',
  blueStrong:  '#3A7FBE',
  blueLight:   '#B8CCE4',
  blueBg:      '#EAF2FA',
  yellow:      '#FFD966',
  yellowStrong:'#946C00',
  yellowBg:    '#FFF7DC',
  red:         '#FF6B6B',
  redStrong:   '#c04242',
  redBg:       '#FDECEC',
  greenStrong: '#1F7A4D',
  greenBg:     '#E6F4EC',
};

export const MOBILE = {
  inputFont:  16,
  btnHeight:  48,
  segHeight:  44,
  radius:     12,
  radiusCard: 14,
};

export const TI = ({ name, size = 16, color, style }) => (
  <i
    className={`ti ti-${name}`}
    style={{ fontSize: size, color, lineHeight: 1, ...style }}
    aria-hidden
  />
);

export const BtnMobile = ({
  variant = 'primary',
  disabled,
  icon,
  iconEnd,
  children,
  fullWidth = true,
  style,
  ...rest
}) => {
  const { T } = useTheme();
  const base = {
    minHeight: MOBILE.btnHeight,
    borderRadius: MOBILE.radius,
    padding: '0 16px',
    fontSize: 15,
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: '1px solid transparent',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.55 : 1,
    transition: 'background .12s, transform .04s',
    WebkitTapHighlightColor: 'transparent',
  };
  const variants = {
    primary: {
      background: PALETA.blue,
      color: '#fff',
      borderColor: PALETA.blueStrong,
      boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.08)',
    },
    ghost:   { background: T.card, color: T.textPrimary, borderColor: T.border },
    dashed:  { background: '#F4F7FB', color: PALETA.blueStrong, borderStyle: 'dashed', borderColor: PALETA.blueLight },
    yellow:  { background: PALETA.yellow, color: '#3A2A00', borderColor: '#E5BD3E' },
    danger:  { background: '#fff', color: PALETA.redStrong, borderColor: '#E89B9B' },
  };
  return (
    <button {...rest} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>
      {icon && <TI name={icon} size={18} />}
      <span>{children}</span>
      {iconEnd && <TI name={iconEnd} size={18} />}
    </button>
  );
};

export const Pill = ({ tone = 'neutral', icon, children, style }) => {
  const { T, dark } = useTheme();
  // Dark mode: bg vira rgba transparente da cor forte + border do mesmo tom.
  // Light mode: mantem PALETA.*Bg original (cinza claro do tom).
  const tones = {
    neutral: { bg: dark ? 'transparent' : T.card,
               fg: T.textPrimary, bd: T.border },
    blue:    { bg: dark ? 'rgba(91,155,213,0.15)' : PALETA.blueBg,
               fg: dark ? PALETA.blue : PALETA.blueStrong,
               bd: dark ? 'rgba(91,155,213,0.35)' : '#CDDFEF' },
    red:     { bg: dark ? 'rgba(192,66,66,0.15)' : PALETA.redBg,
               fg: dark ? '#FF8888' : PALETA.redStrong,
               bd: dark ? 'rgba(192,66,66,0.35)' : '#F6CFCF' },
    yellow:  { bg: dark ? 'rgba(255,217,102,0.15)' : PALETA.yellowBg,
               fg: dark ? '#FFD966' : PALETA.yellowStrong,
               bd: dark ? 'rgba(255,217,102,0.35)' : '#F0DDA0' },
    green:   { bg: dark ? 'rgba(46,125,94,0.18)' : PALETA.greenBg,
               fg: dark ? '#7FCEA8' : PALETA.greenStrong,
               bd: dark ? 'rgba(46,125,94,0.40)' : '#CFE7DA' },
  };
  const v = tones[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 10px', borderRadius: 999,
      fontSize: 12, fontWeight: 500,
      background: v.bg, color: v.fg, border: `1px solid ${v.bd}`,
      whiteSpace: 'nowrap', ...style,
    }}>
      {icon && <TI name={icon} size={14} />}
      {children}
    </span>
  );
};

export const NowCard = ({ icon = 'sparkles', titulo, descricao, children }) => {
  const { T, dark } = useTheme();
  return (
    <div className="idemaq-card" style={{
      background: dark ? 'rgba(91,155,213,0.10)' : PALETA.blueBg,
      border: `1px solid ${dark ? 'rgba(91,155,213,0.35)' : '#D2E1F1'}`,
      borderRadius: MOBILE.radiusCard,
      padding: 14,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        color: dark ? PALETA.blue : PALETA.blueStrong, fontWeight: 700, fontSize: 11,
        letterSpacing: '.08em', textTransform: 'uppercase',
      }}>
        <TI name={icon} size={16} />
        Fazer agora · {titulo}
      </div>
      {descricao && (
        <div style={{ color: T.textPrimary, fontSize: 13.5, lineHeight: 1.45 }}>
          {descricao}
        </div>
      )}
      {children}
    </div>
  );
};

export const ContextCard = ({ children, style }) => {
  const { T } = useTheme();
  return (
    <div className="idemaq-card" style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: MOBILE.radius, padding: 12,
      display: 'flex', flexDirection: 'column', gap: 10,
      ...style,
    }}>
      {children}
    </div>
  );
};

export const ContextRow = ({ icon, label, value, valueStyle }) => {
  const { T } = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13 }}>
      <TI name={icon} size={16} color={T.textMuted} style={{ marginTop: 2 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          color: T.textMuted, fontSize: 11, fontWeight: 600,
          letterSpacing: '.06em', textTransform: 'uppercase',
        }}>{label}</div>
        <div style={{ color: T.textPrimary, fontWeight: 500, ...valueStyle }}>
          {value}
        </div>
      </div>
    </div>
  );
};

export const LockWarn = ({ children, icon = 'lock' }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    background: PALETA.redBg, color: PALETA.redStrong,
    border: '1px solid #F6CFCF', borderRadius: MOBILE.radius,
    padding: '8px 10px', fontSize: 12, fontWeight: 500,
  }}>
    <TI name={icon} size={14} />
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</span>
  </div>
);

export const Group = ({ label, opcional, hint, children }) => {
  const { T } = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase',
          color: T.textMuted, fontWeight: 600,
        }}>
          <span>{label}</span>
          {opcional && (
            <span style={{ color: T.textMuted, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
              · opcional
            </span>
          )}
        </div>
      )}
      {children}
      {hint && (
        <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{hint}</div>
      )}
    </div>
  );
};

export const Input = React.forwardRef(({ icon, style, ...rest }, ref) => {
  const { T } = useTheme();
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: MOBILE.radius, minHeight: MOBILE.btnHeight,
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '0 12px', ...style,
    }}>
      {icon && <TI name={icon} size={18} color={T.textMuted} />}
      <input
        ref={ref}
        {...rest}
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'transparent',
          fontSize: MOBILE.inputFont, color: T.textPrimary, minWidth: 0,
          height: '100%', padding: '12px 0',
        }}
      />
    </div>
  );
});

export const TextArea = ({ icon, style, ...rest }) => {
  const { T } = useTheme();
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: MOBILE.radius, padding: 12,
      display: 'flex', alignItems: 'flex-start', gap: 8, ...style,
    }}>
      {icon && <TI name={icon} size={18} color={T.textMuted} style={{ marginTop: 2 }} />}
      <textarea
        {...rest}
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'transparent',
          fontSize: MOBILE.inputFont, color: T.textPrimary, resize: 'vertical',
          minHeight: 72, lineHeight: 1.45,
        }}
      />
    </div>
  );
};

export const InfoBox = ({ icon = 'info-circle', children }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', gap: 8,
    background: PALETA.blueBg, border: '1px solid #D2E1F1',
    borderRadius: MOBILE.radius, padding: '10px 12px',
    fontSize: 12.5, color: '#1F3F5F', lineHeight: 1.45,
  }}>
    <TI name={icon} size={16} color={PALETA.blueStrong} style={{ marginTop: 1, flexShrink: 0 }} />
    <span>{children}</span>
  </div>
);

export const formatAtraso = (dias) => {
  if (!dias || dias <= 0) return null;
  if (dias > 999) return '999d+';
  return `${dias}d`;
};
