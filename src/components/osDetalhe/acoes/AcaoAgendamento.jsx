import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../../../theme';
import {
  TI, BtnMobile, NowCard, Group, Input, PALETA, MOBILE,
} from '../../_shared/PrimitivasMobile';

const DOW = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const proxNDias = (n = 14) => {
  const dias = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() + i);
    dias.push({
      iso:   d.toISOString().slice(0, 10),
      dia:   d.getDate(),
      dow:   DOW[d.getDay()],
      isHoje: i === 0,
    });
  }
  return dias;
};

const PERIODOS = [
  { id: 'manha', label: 'Manhã', icon: 'sunrise', ini: 6,  fim: 12 },
  { id: 'tarde', label: 'Tarde', icon: 'sun',     ini: 12, fim: 18 },
  { id: 'noite', label: 'Noite', icon: 'moon',    ini: 18, fim: 22 },
];

const horariosDoPeriodo = (periodoId) => {
  const p = PERIODOS.find(x => x.id === periodoId) || PERIODOS[1];
  const out = [];
  for (let h = p.ini; h < p.fim; h++) {
    for (let m = 0; m < 60; m += 15) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return out;
};

const fmtBR = (iso) => {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

const SubAgAgenda = ({ os, onUpdateOS }) => {
  const { T } = useTheme();
  const dias = useMemo(() => proxNDias(14), []);
  const [diaSel, setDiaSel] = useState(os?.coleta?.data || dias[1]?.iso);
  const [periodoSel, setPeriodoSel] = useState(os?.coleta?.periodo || 'tarde');
  const [horaSel, setHoraSel] = useState(os?.coleta?.hora || null);

  const diasOcupados = useMemo(
    () => new Set(os?.diasComColeta || []),
    [os?.diasComColeta]
  );
  const horariosOcupados = useMemo(
    () => new Set(os?.horariosOcupados?.[diaSel] || []),
    [os?.horariosOcupados, diaSel]
  );

  const horarios = useMemo(() => horariosDoPeriodo(periodoSel), [periodoSel]);

  const podeConfirmar = !!diaSel && !!horaSel;
  const confirmar = () => onUpdateOS?.({
    action: 'confirmar_agendamento',
    data: diaSel, hora: horaSel, periodo: periodoSel,
  });

  const ctaLabel = podeConfirmar
    ? `Confirmar ${fmtBR(diaSel)} · ${horaSel}`
    : 'Escolha dia e hora';

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <NowCard icon="calendar-event" titulo="aguardando agendamento"
               descricao="Escolha o dia, depois o horário." />

      <div>
        <div style={{
          fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase',
          color: T.textMuted, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
        }}>
          <TI name="calendar" size={13} color={PALETA.blueStrong} />
          DIA · próximos 14 dias
        </div>
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto',
          margin: '0 -14px', padding: '0 14px', scrollbarWidth: 'none',
        }}>
          {dias.map(d => {
            const sel = d.iso === diaSel;
            const busy = diasOcupados.has(d.iso);
            return (
              <button key={d.iso} onClick={() => setDiaSel(d.iso)}
                style={{
                  flex: '0 0 auto', width: 54,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '8px 0', borderRadius: 12,
                  background: sel ? PALETA.blue : T.card,
                  border: `1px solid ${sel ? PALETA.blueStrong : T.border}`,
                  cursor: 'pointer', position: 'relative',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                <span style={{
                  fontSize: 9.5, fontWeight: 700,
                  color: sel ? 'rgba(255,255,255,.85)' : T.textMuted,
                  textTransform: 'uppercase', letterSpacing: '.08em',
                }}>{d.dow}</span>
                <span style={{
                  fontSize: 18, fontWeight: 700,
                  color: sel ? '#fff' : T.textPrimary,
                  marginTop: 2, lineHeight: 1.1,
                }}>{d.dia}</span>
                {busy && (
                  <span style={{
                    position: 'absolute', bottom: 5, left: '50%',
                    transform: 'translateX(-50%)',
                    width: 4, height: 4, borderRadius: 99,
                    background: sel ? PALETA.yellow : PALETA.yellowStrong,
                  }}/>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{
          fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase',
          color: T.textMuted, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
        }}>
          <TI name="clock" size={13} color={PALETA.blueStrong} /> PERÍODO
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PERIODOS.map(p => {
            const sel = p.id === periodoSel;
            return (
              <button key={p.id} onClick={() => setPeriodoSel(p.id)}
                style={{
                  flex: 1, padding: '8px 4px',
                  background: sel ? PALETA.blueBg : T.card,
                  border: `1px solid ${sel ? PALETA.blueLight : T.border}`,
                  borderRadius: 10,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 2,
                  fontSize: 11, fontWeight: 600,
                  color: sel ? PALETA.blueStrong : T.textMuted,
                  cursor: 'pointer',
                }}>
                <TI name={p.icon} size={18}
                    color={sel ? PALETA.blueStrong : '#9CA3AF'} />
                <span>{p.label}</span>
                <span style={{
                  fontSize: 10, color: '#9CA3AF',
                  fontFamily: 'ui-monospace,monospace',
                }}>{p.ini}–{p.fim}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div style={{
          fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase',
          color: T.textMuted, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
        }}>
          <TI name="clock-hour-4" size={13} color={PALETA.blueStrong} />
          HORÁRIO · 15 em 15 min
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
        }}>
          {horarios.map(h => {
            const sel = h === horaSel;
            const gone = horariosOcupados.has(h);
            return (
              <button key={h} disabled={gone}
                onClick={() => !gone && setHoraSel(h)}
                style={{
                  minHeight: MOBILE.btnHeight, borderRadius: 10,
                  background: sel ? PALETA.blue : (gone ? '#F8F9FB' : T.card),
                  border: `1px solid ${sel ? PALETA.blueStrong : T.border}`,
                  color: sel ? '#fff' : (gone ? '#D1D5DB' : T.textPrimary),
                  fontSize: 14.5, fontWeight: 600,
                  fontFamily: 'ui-monospace,monospace',
                  letterSpacing: '.02em',
                  cursor: gone ? 'not-allowed' : 'pointer',
                  textDecoration: gone ? 'line-through' : 'none',
                  boxShadow: sel ? '0 1px 0 rgba(0,0,0,.06)' : 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}>{h}</button>
            );
          })}
        </div>
      </div>

      <BtnMobile variant="yellow" icon="calendar-check"
                 disabled={!podeConfirmar} onClick={confirmar}
                 style={{ marginTop: 4 }}>
        {ctaLabel}
      </BtnMobile>
    </div>
  );
};

const SubAgendado = ({ os, onUpdateOS }) => {
  const { T } = useTheme();
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const alvo = useMemo(() => {
    const data = os?.coleta?.data, hora = os?.coleta?.hora;
    if (!data || !hora) return null;
    return new Date(`${data}T${hora}:00`);
  }, [os?.coleta?.data, os?.coleta?.hora]);

  const { bigLabel, unitLabel, pct, prox } = useMemo(() => {
    if (!alvo) return { bigLabel: '—', unitLabel: '', pct: 0, prox: false };
    const deltaMs = alvo.getTime() - agora.getTime();
    if (deltaMs <= 0) return { bigLabel: 'agora', unitLabel: '', pct: 100, prox: true };
    const min = Math.floor(deltaMs / 60_000);
    const h = Math.floor(min / 60), m = min % 60;
    const big = h >= 1 ? `${h}h` : `${m}min`;
    const unit = h >= 1 ? `${m}min` : '';
    const totalMs = Math.max(deltaMs, 48 * 60 * 60_000);
    const pctVal = Math.max(5, Math.min(95, 100 - (deltaMs / totalMs) * 100));
    return { bigLabel: big, unitLabel: unit, pct: pctVal, prox: h < 1 };
  }, [alvo, agora]);

  const coletaLabel = alvo
    ? `${fmtBR(os?.coleta?.data)} · ${os?.coleta?.hora}`
    : 'Sem horário definido';
  const distancia = os?.cliente?.distanciaKm
    ? `${os.cliente.distanciaKm} km` : '—';

  const [showIdent, setShowIdent] = useState(prox);
  useEffect(() => { if (prox) setShowIdent(true); }, [prox]);

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="idemaq-card" style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: MOBILE.radiusCard, padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 4, background: PALETA.blue,
        }}/>
        <div style={{
          fontSize: 11, color: PALETA.blueStrong, fontWeight: 700,
          letterSpacing: '.08em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <TI name="clock" size={14} /> COLETA EM
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontSize: 36, fontWeight: 700, color: T.textPrimary,
            letterSpacing: '-.02em', lineHeight: 1,
            fontFamily: 'ui-monospace,monospace',
          }}>{bigLabel}</span>
          {unitLabel && <span style={{ fontSize: 13, color: T.textMuted, fontWeight: 500 }}>{unitLabel}</span>}
        </div>
        <div style={{
          fontSize: 13, color: T.textMuted,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <TI name="calendar-event" size={14} />
          <b style={{ color: T.textPrimary, fontWeight: 600 }}>{coletaLabel}</b>
        </div>
        <div style={{ height: 6, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden' }}>
          <span style={{
            display: 'block', height: '100%', width: `${pct}%`,
            background: 'linear-gradient(90deg,#5B9BD5,#4A86C0)',
            borderRadius: 99, transition: 'width .3s',
          }}/>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10.5, color: T.textMuted, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '.06em',
        }}>
          <span>agendado</span><span>coleta</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={() => onUpdateOS?.({ action: 'contatar_cliente' })}
          style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 12, padding: 12,
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer', textAlign: 'left',
          }}>
          <span style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#E8F8EC', color: '#25804E',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}><TI name="brand-whatsapp" size={16} color="#25D366" /></span>
          <span>
            <span style={{
              display: 'block', fontSize: 11, color: T.textMuted,
              fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase',
            }}>Confirmar com</span>
            <span style={{
              display: 'block', fontSize: 13, color: T.textPrimary,
              fontWeight: 600, marginTop: 2,
            }}>{os?.cliente?.primeiroNome || 'Cliente'}</span>
          </span>
        </button>

        <button onClick={() => onUpdateOS?.({ action: 'abrir_rota' })}
          style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 12, padding: 12,
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer', textAlign: 'left',
          }}>
          <span style={{
            width: 36, height: 36, borderRadius: 10,
            background: PALETA.blueBg, color: PALETA.blueStrong,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}><TI name="map-pin" size={16} /></span>
          <span>
            <span style={{
              display: 'block', fontSize: 11, color: T.textMuted,
              fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase',
            }}>Distância</span>
            <span style={{
              display: 'block', fontSize: 13, color: T.textPrimary,
              fontWeight: 600, marginTop: 2,
            }}>{distancia}</span>
          </span>
        </button>
      </div>

      {showIdent ? (
        <Group label={(
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <TI name="package-import" size={13} color={PALETA.yellowStrong} />
            NA HORA DA COLETA
          </span>
        )}>
          <IdentificacaoMaquina os={os} onUpdateOS={onUpdateOS} />
        </Group>
      ) : (
        <button onClick={() => setShowIdent(true)}
          style={{
            background: '#F8F9FB', border: `1px dashed ${T.border}`,
            borderRadius: MOBILE.radiusCard, padding: 14,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            cursor: 'pointer', textAlign: 'center',
          }}>
          <span style={{
            fontSize: 11, color: T.textMuted, fontWeight: 700,
            letterSpacing: '.08em', textTransform: 'uppercase',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <TI name="package-import" size={13} /> NA HORA DA COLETA
          </span>
          <span style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.4 }}>
            Quando a máquina chegar, abra aqui pra <b style={{ color: T.textPrimary }}>identificar e confirmar</b>.
          </span>
          <span style={{
            fontSize: 12, color: PALETA.blueStrong, fontWeight: 600, marginTop: 2,
          }}>
            <TI name="chevron-down" size={14} style={{ marginRight: 4 }} />
            tirar foto agora (opcional)
          </span>
        </button>
      )}
    </div>
  );
};

const IdentificacaoMaquina = ({ os, onUpdateOS }) => {
  const [modelo, setModelo] = useState(os?.equipamento?.modelo || '');
  const [serie,  setSerie ] = useState(os?.equipamento?.serie  || '');
  const temIdent = !!os?.fotoUrl || (modelo && serie);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <BtnMobile variant="dashed" icon="camera"
        onClick={() => onUpdateOS?.({ action: 'tirar_foto' })}>
        {os?.fotoUrl ? 'Trocar foto da máquina' : 'Tirar foto da máquina'}
      </BtnMobile>
      <div style={{
        textAlign: 'center', fontSize: 11, letterSpacing: '.1em',
        color: '#9CA3AF', fontWeight: 700,
      }}>OU</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Input placeholder="Ex: BWK11A" value={modelo}
               onChange={(e) => setModelo(e.target.value)} />
        <Input placeholder="Ex: BR-2024-887" value={serie}
               onChange={(e) => setSerie(e.target.value)} />
      </div>
      <BtnMobile variant="yellow" icon="package-import" disabled={!temIdent}
        onClick={() => onUpdateOS?.({
          action: 'confirmar_recebimento', modelo, serie,
        })}
        style={{ marginTop: 4 }}>
        Confirmar recebimento
      </BtnMobile>
    </div>
  );
};

const AcaoAgendamento = ({ os, onUpdateOS }) => {
  if (os?.etapa === 'agendado') {
    return <SubAgendado os={os} onUpdateOS={onUpdateOS} />;
  }
  return <SubAgAgenda os={os} onUpdateOS={onUpdateOS} />;
};

export default AcaoAgendamento;
