import React, { useState, useMemo } from 'react';
import { useTheme } from '../../theme';
import { TI, PALETA } from '../_shared/PrimitivasMobile';
import HeaderMobile from './HeaderMobile';
import FooterMobile from './FooterMobile';

import AcaoAgendamento from './acoes/AcaoAgendamento';
import AcaoRecebido    from './acoes/AcaoRecebido';
import AcaoDiagnostico from './acoes/AcaoDiagnostico';
import AcaoOrcamento   from './acoes/AcaoOrcamento';
import AcaoOficina     from './acoes/AcaoOficina';
import AcaoConcluido   from './acoes/AcaoConcluido';

import RelatorioTab    from './tabs/RelatorioTab';
import PagamentoTab    from './tabs/PagamentoTab';

const TABS = [
  { id: 'etapa',     label: 'Etapa',     icon: 'clipboard-list' },
  { id: 'relatorio', label: 'Relatório', icon: 'info-circle' },
  { id: 'pagamento', label: 'Pagamento', icon: 'receipt' },
];

const ACAO_POR_ETAPA = {
  ag_agenda:   AcaoAgendamento,
  agendado:    AcaoAgendamento,
  recebido:    AcaoRecebido,
  diagnostico: AcaoDiagnostico,
  orcamento:   AcaoOrcamento,
  oficina:     AcaoOficina,
  teste_final: AcaoOficina,
  concluida:   AcaoConcluido,
};

const PROXIMA_LABEL = {
  ag_agenda:   'Agendado',
  agendado:    'Recebido',
  recebido:    'Diagnóstico',
  diagnostico: 'Orçamento',
  orcamento:   'Em oficina',
  oficina:     'Teste final',
  teste_final: 'Concluir',
  concluida:   null,
};

const OSDetalhe = ({
  os,
  mobile = true,
  onClose,
  onAvancar,
  onVoltar,
  onUpdateOS,
  onHistory,
}) => {
  const { T } = useTheme();
  const [tab, setTab] = useState('etapa');

  const AcaoEtapa = useMemo(
    () => ACAO_POR_ETAPA[os?.etapa] || AcaoAgendamento,
    [os?.etapa]
  );

  const bloqueio = useMemo(() => {
    if (os?.etapa === 'oficina' && !os?.orcamento?.itens?.length) {
      return 'Conclua o orçamento antes de executar.';
    }
    if (os?.etapa === 'teste_final' && !os?.limpezaConcluida) {
      return 'Limpeza e manutenção precisam estar concluídas antes do teste final.';
    }
    return null;
  }, [os]);

  const podeAvancar = !bloqueio && PROXIMA_LABEL[os?.etapa] !== null;
  const showFooter = os?.etapa !== 'concluida';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,18,23,.45)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 640, height: 'calc(100% - 6px)',
        background: T.bg,
        borderTopLeftRadius: 18, borderTopRightRadius: 18,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 -20px 40px -10px rgba(0,0,0,.25)',
      }}>
        {/* grabber */}
        <div style={{
          width: 36, height: 4, background: '#D1D5DB',
          borderRadius: 99, margin: '6px auto 4px',
        }}/>

        <HeaderMobile
          os={os}
          onClose={onClose}
          onHistory={onHistory}
          historyCount={os?.historicoCount || 0}
          onAdicionarEquipamento={() => onUpdateOS?.({ action: 'adicionar_equipamento' })}
          onMore={() => onUpdateOS?.({ action: 'open_more_menu' })}
        />

        {/* Tabs B1 (underline) */}
        <div style={{
          display: 'flex', background: T.card,
          borderBottom: `1px solid ${T.border}`,
        }}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1, border: 'none', background: 'transparent',
                  padding: '14px 6px', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 500,
                  color: active ? PALETA.blueStrong : T.textMuted,
                  position: 'relative',
                }}
              >
                <TI name={t.icon} size={15} />
                {t.label}
                {active && (
                  <span style={{
                    position: 'absolute', left: '18%', right: '18%', bottom: -1,
                    height: 2, background: PALETA.blue, borderRadius: 2,
                  }}/>
                )}
              </button>
            );
          })}
        </div>

        {/* Conteúdo da aba */}
        <div style={{
          flex: 1, overflow: 'auto', background: T.bg,
          WebkitOverflowScrolling: 'touch',
        }}>
          {tab === 'etapa' && (
            <AcaoEtapa
              os={os}
              onUpdateOS={onUpdateOS}
              onAbrirAba={setTab}
            />
          )}
          {tab === 'relatorio' && (
            <RelatorioTab os={os} />
          )}
          {tab === 'pagamento' && (
            <PagamentoTab
              os={os}
              onUpdateOS={onUpdateOS}
              mobile
            />
          )}
        </div>

        {showFooter && (
          <FooterMobile
            onVoltar={onVoltar}
            onAvancar={onAvancar}
            proximaEtapaLabel={PROXIMA_LABEL[os?.etapa] || 'Próximo'}
            podeAvancar={podeAvancar}
            bloqueio={bloqueio}
          />
        )}
      </div>
    </div>
  );
};

export default OSDetalhe;
