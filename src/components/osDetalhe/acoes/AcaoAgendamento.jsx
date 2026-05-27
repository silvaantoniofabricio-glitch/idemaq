import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTheme } from '../../../theme';
import {
  TI, BtnMobile, NowCard, Group, Input, PALETA, MOBILE,
} from '../../_shared/PrimitivasMobile';
import BlocoAcao from './BlocoAcao';
import { uploadFotoOS, resolverFotoUrl, removerFotoOS, FOTO_STORAGE_MARKER } from '../../../utils/osStorage';

// ─── Wrapper flat sem titulo "FAZER AGORA" — so children com gap entre eles.
// Mantido como funcao pra deixar facil voltar o header depois se mudar de ideia.
function HeaderFlat({ children, gap = 8 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {children}
    </div>
  )
}

// ─── Sub-card estilo Orçamento (GrupoBlock) — reutilizado pela V2 ────────────
// Header compacto (~50% mais fino que o original): padding 4px, icone 20x20.
function SubBloco({ T, dark, icon, label, color = 'blue', children, action }) {
  const colorMap = {
    blue:   { fg: PALETA.blueStrong,   bg: dark ? 'rgba(91,155,213,0.18)' : PALETA.blueBg },
    yellow: { fg: PALETA.yellowStrong, bg: dark ? 'rgba(255,217,102,0.18)' : PALETA.yellowBg },
    green:  { fg: PALETA.greenStrong,  bg: dark ? 'rgba(46,125,94,0.18)' : PALETA.greenBg },
    red:    { fg: PALETA.redStrong,    bg: dark ? 'rgba(192,66,66,0.18)' : PALETA.redBg },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 10, overflow: 'hidden',
    }}>
      <div style={{
        padding: '3px 6px 3px 8px',
        background: dark ? 'rgba(255,255,255,0.03)' : T.cardAlt,
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        <span style={{
          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
          background: c.bg, color: c.fg,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TI name={icon} size={11} />
        </span>
        <span style={{
          flex: 1, fontSize: 11, fontWeight: 700, color: T.textPrimary,
          textTransform: 'uppercase', letterSpacing: '.04em',
        }}>{label}</span>
        {action}
      </div>
      <div style={{ padding: '10px 12px' }}>
        {children}
      </div>
    </div>
  );
}

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
  const { T, dark } = useTheme();
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
                  background: sel ? (dark ? 'rgba(91,155,213,0.18)' : PALETA.blueBg) : T.card,
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
                  background: sel ? PALETA.blue : (gone ? (dark ? 'rgba(255,255,255,0.04)' : '#F8F9FB') : T.card),
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
  const { T, dark } = useTheme();
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
        <div style={{ height: 6, background: dark ? 'rgba(255,255,255,0.10)' : '#E5E7EB', borderRadius: 99, overflow: 'hidden' }}>
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
            background: dark ? 'rgba(46,125,94,0.20)' : '#E8F8EC', color: dark ? '#7FCEA8' : '#25804E',
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
            background: dark ? 'rgba(91,155,213,0.18)' : PALETA.blueBg, color: dark ? PALETA.blue : PALETA.blueStrong,
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
            background: dark ? 'rgba(255,255,255,0.04)' : '#F8F9FB', border: `1px dashed ${T.border}`,
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

// V2: 2 sub-blocos separados (Dados + Fotos) + CTA. Fragment retornado pra
// que cada bloco apareça como card independente no V2.
const IdentificacaoMaquina = ({ os, onUpdateOS, onMoverOS }) => {
  const { T, dark } = useTheme();
  const [modelo, setModelo] = useState(os?.modelo || '');
  const [serie,  setSerie ] = useState(os?.serie  || '');
  // 2 fotos: 'coleta_1' (etiqueta) + 'coleta_2' (estado).
  // Markers ficam em pre_diagnostico.foto_coleta_1 / _2.
  const ref1 = pre => pre?.foto_coleta_1 || pre?.foto_coleta || null;
  const ref2 = pre => pre?.foto_coleta_2 || null;
  const [foto1Url, setFoto1Url] = useState(null);
  const [foto2Url, setFoto2Url] = useState(null);
  const [up1, setUp1] = useState(false);
  const [up2, setUp2] = useState(false);
  const input1 = useRef(null);
  const input2 = useRef(null);

  useEffect(() => {
    let canc = false;
    (async () => {
      const u1 = await resolverFotoUrl(ref1(os?.pre_diagnostico), os?.id, 'coleta_1');
      const u2 = await resolverFotoUrl(ref2(os?.pre_diagnostico), os?.id, 'coleta_2');
      if (!canc) { setFoto1Url(u1); setFoto2Url(u2); }
    })();
    return () => { canc = true };
  }, [os?.id, os?.pre_diagnostico]);

  async function escolherFoto(file, slot) {
    if (!file?.type?.startsWith('image/')) return;
    const setUp = slot === 1 ? setUp1 : setUp2;
    setUp(true);
    const tipo = slot === 1 ? 'coleta_1' : 'coleta_2';
    const res = await uploadFotoOS(os.id, file, tipo);
    setUp(false);
    if (!res.ok) return;
    if (slot === 1) setFoto1Url(res.url);
    else setFoto2Url(res.url);
    onUpdateOS?.(os.numero, {
      pre_diagnostico: {
        ...(os.pre_diagnostico || {}),
        [`foto_coleta_${slot}`]: FOTO_STORAGE_MARKER,
      },
    });
  }
  async function removerFotoSlot(slot) {
    if (!window.confirm('Remover esta foto?')) return;
    const tipo = slot === 1 ? 'coleta_1' : 'coleta_2';
    await removerFotoOS(os.id, tipo);
    if (slot === 1) setFoto1Url(null); else setFoto2Url(null);
    const key = `foto_coleta_${slot}`;
    const { [key]: _, ...resto } = os.pre_diagnostico || {};
    onUpdateOS?.(os.numero, { pre_diagnostico: resto });
  }

  const temIdent = !!(modelo || foto1Url || foto2Url);

  function confirmar() {
    // Persiste modelo + serie e move pra Recebido
    const patch = {};
    if (modelo !== (os?.modelo || '')) patch.modelo_equipamento = modelo;
    if (serie  !== (os?.serie  || '')) patch.numero_serie = serie;
    if (Object.keys(patch).length) onUpdateOS?.(os.numero, patch);
    onMoverOS?.(os.numero, 'recebido');
  }

  return (
    <>
      {/* SUB-BLOCO 1: Dados do equipamento (modelo + serie) */}
      <SubBloco T={T} dark={dark} icon="device-laptop" label="Dados do equipamento" color="blue">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label style={{
            display: 'flex', flexDirection: 'column', gap: 3,
            minWidth: 0,  // Permite encolher no grid
          }}>
            <span style={{
              fontSize: 10, color: T.textMuted, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '.04em',
            }}>Modelo</span>
            <input
              placeholder="Ex: BWK11A" value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '7px 9px', borderRadius: 6,
                border: `1px solid ${T.border}`,
                background: T.bg, color: T.textPrimary,
                fontSize: 13, outline: 'none', fontFamily: 'inherit',
                minWidth: 0,
              }}
            />
          </label>
          <label style={{
            display: 'flex', flexDirection: 'column', gap: 3,
            minWidth: 0,
          }}>
            <span style={{
              fontSize: 10, color: T.textMuted, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '.04em',
            }}>Nº de série</span>
            <input
              placeholder="Ex: BR-2024-887" value={serie}
              onChange={(e) => setSerie(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '7px 9px', borderRadius: 6,
                border: `1px solid ${T.border}`,
                background: T.bg, color: T.textPrimary,
                fontSize: 13, outline: 'none',
                fontFamily: 'ui-monospace, monospace',
                minWidth: 0,
              }}
            />
          </label>
        </div>
      </SubBloco>

      {/* SUB-BLOCO 2: Fotos do equipamento (2 slots lado a lado) */}
      <SubBloco T={T} dark={dark} icon="camera" label="Fotos do equipamento" color="blue">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <FotoSlot
            T={T} dark={dark}
            label="Etiqueta"
            url={foto1Url} uploading={up1}
            onPick={() => input1.current?.click()}
            onRemove={() => removerFotoSlot(1)}
          />
          <input ref={input1} type="file" accept="image/*" capture="environment"
            onChange={(e) => escolherFoto(e.target.files?.[0], 1)}
            style={{ display: 'none' }} />
          <FotoSlot
            T={T} dark={dark}
            label="Estado"
            url={foto2Url} uploading={up2}
            onPick={() => input2.current?.click()}
            onRemove={() => removerFotoSlot(2)}
          />
          <input ref={input2} type="file" accept="image/*" capture="environment"
            onChange={(e) => escolherFoto(e.target.files?.[0], 2)}
            style={{ display: 'none' }} />
        </div>
      </SubBloco>

      {/* CTA: Confirmar recebimento — avança pra Recebido */}
      <button onClick={confirmar} disabled={!temIdent}
        style={{
          minHeight: 36, padding: '0 14px', borderRadius: 8, border: 'none',
          background: temIdent ? PALETA.yellow : T.cardAlt,
          color: temIdent ? '#0a0a0d' : T.textDim,
          fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
          cursor: temIdent ? 'pointer' : 'not-allowed',
          opacity: temIdent ? 1 : 0.55,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
        <TI name="package-import" size={14} />
        Confirmar recebimento
      </button>
    </>
  );
};

// Slot de foto compacto (114x76) — placeholder com "+" quando vazio
function FotoSlot({ T, dark, label, url, uploading, onPick, onRemove }) {
  return (
    <div style={{
      position: 'relative',
      borderRadius: 8, overflow: 'hidden',
      border: `1px ${url ? 'solid' : 'dashed'} ${T.border}`,
      background: url ? '#000' : (dark ? 'rgba(255,255,255,0.03)' : T.cardAlt),
      aspectRatio: '4 / 3', minHeight: 76,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {url ? (
        <>
          <img src={url} alt={label}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <button type="button" onClick={onPick}
            title="Trocar foto"
            style={{
              position: 'absolute', top: 4, right: 26,
              width: 22, height: 22, borderRadius: 5,
              background: 'rgba(0,0,0,0.6)', color: '#fff',
              border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <TI name="camera" size={12} />
          </button>
          <button type="button" onClick={onRemove}
            title="Remover"
            style={{
              position: 'absolute', top: 4, right: 4,
              width: 22, height: 22, borderRadius: 5,
              background: 'rgba(192,66,66,0.85)', color: '#fff',
              border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <TI name="x" size={12} />
          </button>
          <span style={{
            position: 'absolute', bottom: 4, left: 6,
            fontSize: 10, color: '#fff', fontWeight: 600,
            background: 'rgba(0,0,0,0.5)', padding: '1px 6px', borderRadius: 4,
          }}>{label}</span>
        </>
      ) : (
        <button type="button" onClick={onPick}
          disabled={uploading}
          style={{
            width: '100%', height: '100%',
            background: 'transparent', border: 'none',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 4,
            color: PALETA.blueStrong, fontFamily: 'inherit',
            cursor: uploading ? 'wait' : 'pointer',
          }}>
          <TI name={uploading ? 'loader-2' : 'camera-plus'} size={20} />
          <span style={{ fontSize: 11, fontWeight: 600 }}>
            {uploading ? 'Enviando…' : label}
          </span>
        </button>
      )}
    </div>
  );
}

// ============================================================================
// V2 — DEV ONLY. Replica o padrão visual do AcaoOrcamento:
// BlocoAcao "FAZER AGORA" amarelo wrap + sub-cards estilo GrupoBlock
// (header com icone-square + label uppercase). Mesmas medidas e tipografia.
// ============================================================================
const SubAgAgendaV2 = ({ os, onUpdateOS, onMoverOS }) => {
  const { T, dark } = useTheme();
  const dias = useMemo(() => proxNDias(14), []);
  // Inicia com a data ja salva em data_agendamento (preferencia) ou coleta legacy.
  const dataInicial = os?.data_agendamento?.slice(0, 10) || os?.coleta?.data || dias[1]?.iso;
  const horaInicial = os?.data_agendamento?.slice(11, 16) || os?.coleta?.hora || null;
  const [diaSel, setDiaSel] = useState(dataInicial);
  const [periodoSel, setPeriodoSel] = useState(os?.coleta?.periodo || (
    horaInicial && parseInt(horaInicial, 10) < 12 ? 'manha'
      : horaInicial && parseInt(horaInicial, 10) < 18 ? 'tarde'
      : horaInicial ? 'noite' : 'tarde'
  ));
  const [horaSel, setHoraSel] = useState(horaInicial);
  const diasOcupados = useMemo(() => new Set(os?.diasComColeta || []), [os?.diasComColeta]);
  const horariosOcupados = useMemo(
    () => new Set(os?.horariosOcupados?.[diaSel] || []),
    [os?.horariosOcupados, diaSel]
  );
  const horarios = useMemo(() => horariosDoPeriodo(periodoSel), [periodoSel]);
  const podeConfirmar = !!diaSel && !!horaSel;

  // Confirma de verdade: monta ISO, salva data_agendamento + move pra etapa
  // 'agendamento'. Usa as assinaturas reais (numero, patch) e (numero, etapa)
  // — NAO a action-style que nunca foi implementada.
  const confirmar = async () => {
    if (!podeConfirmar) return;
    const iso = new Date(`${diaSel}T${horaSel}:00-04:00`).toISOString();
    await onUpdateOS?.(os.numero, { data_agendamento: iso });
    // Move pra etapa 'agendamento' (unif id). Funciona pra atendimento/fabricacao/venda.
    onMoverOS?.(os.numero, 'agendamento');
  };

  const ctaLabel = podeConfirmar ? `Confirmar ${fmtBR(diaSel)} · ${horaSel}` : 'Escolha dia e hora';

  return (
    <HeaderFlat T={T} dark={dark} icon="calendar-event"
      etapa="Aguardando agendamento">

      {/* Bloco DIA — chips compactos 44x44 */}
      <SubBloco T={T} dark={dark} icon="calendar" label="Dia · próximos 14 dias" color="blue">
        <div style={{
          display: 'flex', gap: 4, overflowX: 'auto',
          margin: '0 -12px', padding: '0 12px', scrollbarWidth: 'none',
        }} className="idemaq-no-scrollbar">
          {dias.map(d => {
            const sel = d.iso === diaSel;
            const busy = diasOcupados.has(d.iso);
            return (
              <button key={d.iso} onClick={() => setDiaSel(d.iso)}
                style={{
                  flex: '0 0 auto', width: 44, height: 44,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '4px 0', borderRadius: 8,
                  background: sel ? PALETA.blue : T.bg,
                  border: `1px solid ${sel ? PALETA.blueStrong : T.border}`,
                  cursor: 'pointer', position: 'relative',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  color: sel ? 'rgba(255,255,255,.85)' : T.textMuted,
                  textTransform: 'uppercase', letterSpacing: '.06em',
                  lineHeight: 1,
                }}>{d.dow}</span>
                <span style={{
                  fontSize: 15, fontWeight: 700,
                  color: sel ? '#fff' : T.textPrimary,
                  marginTop: 1, lineHeight: 1,
                }}>{d.dia}</span>
                {busy && (
                  <span style={{
                    position: 'absolute', bottom: 3, left: '50%',
                    transform: 'translateX(-50%)',
                    width: 3, height: 3, borderRadius: 99,
                    background: sel ? PALETA.yellow : PALETA.yellowStrong,
                  }}/>
                )}
              </button>
            );
          })}
        </div>
      </SubBloco>

      {/* Bloco PERÍODO — pílulas 32px */}
      <SubBloco T={T} dark={dark} icon="clock" label="Período" color="blue">
        <div style={{ display: 'flex', gap: 4 }}>
          {PERIODOS.map(p => {
            const sel = p.id === periodoSel;
            return (
              <button key={p.id} onClick={() => setPeriodoSel(p.id)}
                style={{
                  flex: 1, minHeight: 32, padding: '0 6px', borderRadius: 7,
                  background: sel ? (dark ? 'rgba(91,155,213,0.18)' : PALETA.blueBg) : T.bg,
                  border: `1px solid ${sel ? PALETA.blueLight : T.border}`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  fontSize: 11, fontWeight: 600,
                  color: sel ? PALETA.blueStrong : T.textMuted,
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                <TI name={p.icon} size={12} color={sel ? PALETA.blueStrong : '#9CA3AF'} />
                <span>{p.label}</span>
                <span style={{
                  fontSize: 9.5, color: '#9CA3AF',
                  fontFamily: 'ui-monospace,monospace',
                }}>{p.ini}–{p.fim}</span>
              </button>
            );
          })}
        </div>
      </SubBloco>

      {/* Bloco HORÁRIO — 4 cols × 26px de altura */}
      <SubBloco T={T} dark={dark} icon="clock-hour-4" label="Horário · 15 em 15 min" color="blue">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
          {horarios.map(h => {
            const sel = h === horaSel;
            const gone = horariosOcupados.has(h);
            return (
              <button key={h} disabled={gone}
                onClick={() => !gone && setHoraSel(h)}
                style={{
                  minHeight: 26, borderRadius: 5,
                  background: sel ? PALETA.blue : (gone ? (dark ? 'rgba(255,255,255,0.04)' : '#F8F9FB') : T.bg),
                  border: `1px solid ${sel ? PALETA.blueStrong : T.border}`,
                  color: sel ? '#fff' : (gone ? '#D1D5DB' : T.textPrimary),
                  fontSize: 11.5, fontWeight: 600,
                  fontFamily: 'ui-monospace,monospace',
                  cursor: gone ? 'not-allowed' : 'pointer',
                  textDecoration: gone ? 'line-through' : 'none',
                  WebkitTapHighlightColor: 'transparent',
                  padding: 0,
                }}>{h}</button>
            );
          })}
        </div>
      </SubBloco>

      {/* CTA confirmar — flat amarelo, altura 36 */}
      <button onClick={confirmar} disabled={!podeConfirmar}
        style={{
          minHeight: 36, padding: '0 14px', borderRadius: 8, border: 'none',
          background: podeConfirmar ? PALETA.yellow : T.cardAlt,
          color: podeConfirmar ? '#0a0a0d' : T.textDim,
          fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
          cursor: podeConfirmar ? 'pointer' : 'not-allowed',
          opacity: podeConfirmar ? 1 : 0.55,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
        <TI name="calendar-check" size={14} />
        {ctaLabel}
      </button>
    </HeaderFlat>
  );
};

const SubAgendadoV2 = ({ os, onUpdateOS, onMoverOS }) => {
  const { T, dark } = useTheme();
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Schema real: os.data_agendamento (ISO timestamp). O os.coleta.* era mock.
  const alvo = useMemo(() => {
    const iso = os?.data_agendamento;
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d) ? null : d;
  }, [os?.data_agendamento]);

  const dataISO = alvo ? alvo.toISOString().slice(0, 10) : null;
  const horaStr = alvo ? `${String(alvo.getHours()).padStart(2,'0')}:${String(alvo.getMinutes()).padStart(2,'0')}` : null;

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

  const coletaLabel = alvo ? `${fmtBR(dataISO)} · ${horaStr}` : 'Sem horário definido';

  // Nome curto do cliente (1o nome) — os.cliente eh string no schema real.
  const clienteStr = typeof os?.cliente === 'string' ? os.cliente : (os?.cliente?.nome || '')
  const primeiroNome = clienteStr.split(' ')[0] || 'Cliente'

  const [showIdent, setShowIdent] = useState(prox);
  useEffect(() => { if (prox) setShowIdent(true); }, [prox]);

  // Abre WhatsApp do cliente
  const abrirWhatsApp = () => {
    const fone = (os?.fone || '').replace(/\D/g, '')
    if (!fone) return
    const num = fone.startsWith('55') ? fone : '55' + fone
    window.location.href = `whatsapp://send?phone=${num}`
  }
  // Abre Maps direto no app (sem nova aba do browser).
  // Android: scheme `geo:` aciona o app de mapas default.
  // iOS: scheme `maps://` aciona Apple Maps; fallback pro https tb funciona.
  // Web fallback: https://maps.google.com/ (apenas se nao for mobile).
  const abrirRota = () => {
    if (!os?.endereco) return
    const q = encodeURIComponent(os.endereco)
    const ua = navigator.userAgent || ''
    if (/Android/i.test(ua)) {
      window.location.href = `geo:0,0?q=${q}`
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      window.location.href = `maps://?q=${q}`
    } else {
      window.location.href = `https://www.google.com/maps/search/?api=1&query=${q}`
    }
  }
  // Confirma recebimento — avança pra Recebido
  const confirmarRecebimento = () => {
    onMoverOS?.(os.numero, 'recebido')
  }

  return (
    <HeaderFlat T={T} dark={dark} icon="truck-loading"
      etapa="Agendado · coleta agendada">

      {/* Card countdown compacto */}
      <SubBloco T={T} dark={dark} icon="clock" label="Coleta em" color="blue">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{
            fontSize: 26, fontWeight: 700, color: T.textPrimary,
            letterSpacing: '-.02em', lineHeight: 1,
            fontFamily: 'ui-monospace,monospace',
          }}>{bigLabel}</span>
          {unitLabel && <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 500 }}>{unitLabel}</span>}
        </div>
        <div style={{
          fontSize: 12, color: T.textMuted, marginTop: 5,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <TI name="calendar-event" size={12} />
          <b style={{ color: T.textPrimary, fontWeight: 600 }}>{coletaLabel}</b>
        </div>
        <div style={{
          height: 4, marginTop: 6,
          background: dark ? 'rgba(255,255,255,0.10)' : '#E5E7EB',
          borderRadius: 99, overflow: 'hidden',
        }}>
          <span style={{
            display: 'block', height: '100%', width: `${pct}%`,
            background: 'linear-gradient(90deg,#5B9BD5,#4A86C0)',
            borderRadius: 99, transition: 'width .3s',
          }}/>
        </div>
      </SubBloco>

      {/* 2 atalhos compactos: WhatsApp + Rota */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button onClick={abrirWhatsApp}
          disabled={!os?.fone}
          style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: '6px 10px', minHeight: 40,
            display: 'flex', alignItems: 'center', gap: 8,
            cursor: os?.fone ? 'pointer' : 'not-allowed',
            opacity: os?.fone ? 1 : 0.5,
            textAlign: 'left', fontFamily: 'inherit',
          }}>
          <span style={{
            width: 28, height: 28, borderRadius: 6, flexShrink: 0,
            background: dark ? 'rgba(46,125,94,0.20)' : '#E8F8EC',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}><TI name="brand-whatsapp" size={14} color="#25D366" /></span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{
              display: 'block', fontSize: 9.5, color: T.textMuted,
              fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase',
              lineHeight: 1,
            }}>Confirmar com</span>
            <span style={{
              display: 'block', fontSize: 12, color: T.textPrimary,
              fontWeight: 600, marginTop: 2, lineHeight: 1.1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{primeiroNome}</span>
          </span>
        </button>

        <button onClick={abrirRota}
          disabled={!os?.endereco}
          style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: '6px 10px', minHeight: 40,
            display: 'flex', alignItems: 'center', gap: 8,
            cursor: os?.endereco ? 'pointer' : 'not-allowed',
            opacity: os?.endereco ? 1 : 0.5,
            textAlign: 'left', fontFamily: 'inherit',
          }}>
          <span style={{
            width: 28, height: 28, borderRadius: 6, flexShrink: 0,
            background: dark ? 'rgba(91,155,213,0.18)' : PALETA.blueBg,
            color: dark ? PALETA.blue : PALETA.blueStrong,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}><TI name="map-pin" size={14} /></span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{
              display: 'block', fontSize: 9.5, color: T.textMuted,
              fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase',
              lineHeight: 1,
            }}>Abrir</span>
            <span style={{
              display: 'block', fontSize: 12, color: T.textPrimary,
              fontWeight: 600, marginTop: 2, lineHeight: 1.1,
            }}>Rota</span>
          </span>
        </button>
      </div>

      {/* Dados do equipamento + Fotos + CTA — sao 3 elementos retornados
          pelo IdentificacaoMaquina (2 SubBlocos + 1 button) */}
      <IdentificacaoMaquina os={os} onUpdateOS={onUpdateOS} onMoverOS={onMoverOS} />
    </HeaderFlat>
  );
};

const AcaoAgendamento = ({ os, onUpdateOS, onMoverOS }) => {
  // V2 agora ativada em producao (Vercel) tambem. V1 mantida no arquivo
  // pra rollback rapido caso precise voltar.
  if (os?.etapa === 'agendado') {
    return <SubAgendadoV2 os={os} onUpdateOS={onUpdateOS} onMoverOS={onMoverOS} />;
  }
  return <SubAgAgendaV2 os={os} onUpdateOS={onUpdateOS} onMoverOS={onMoverOS} />;
};

export default AcaoAgendamento;
