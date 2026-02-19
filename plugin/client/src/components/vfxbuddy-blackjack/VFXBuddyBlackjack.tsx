import React, { useMemo } from 'react';
import { VFXBuddyBlackjackProps, DealerExpression } from './types/game';
import { useBlackjack } from './hooks/useBlackjack';
import { handValue } from './utils/cardUtils';
import { COLORS, MASCOT_QUIPS } from './utils/constants';
import { DealerMascot } from './components/Mascot';
import { Hand } from './components/Hand';
import { ChipSelector } from './components/ChipSelector';
import { ActionButtons } from './components/ActionButtons';
import { GameResult } from './components/GameResult';
import { GenerationComplete } from './components/GenerationComplete';
import { StatusBar } from './components/StatusBar';
import { ArrowLeft } from 'lucide-react';

const NEU_BTN = 'var(--shadow-neu-button)';
const NEU_BTN_ACTIVE = 'var(--shadow-neu-button-active)';
const NEU_PRESSED = 'var(--shadow-neu-pressed)';

export const VFXBuddyBlackjack: React.FC<VFXBuddyBlackjackProps> = ({
  isVisible,
  renderTimeRemaining,
  generationComplete,
  onExit,
}) => {
  const { state, actions } = useBlackjack(generationComplete);

  const mascotExpression: DealerExpression = useMemo(() => {
    if (state.showGenComplete) return 'generationComplete';
    if (state.winStreak >= 3 && state.phase === 'betting') return 'hotStreak';

    switch (state.phase) {
      case 'betting':
        return 'idle';
      case 'playerTurn':
        return 'dealing';
      case 'dealerTurn':
        return 'dealing';
      case 'resolved': {
        switch (state.result) {
          case 'blackjack': return 'playerBlackjack';
          case 'win': {
            const dealerBusted = state.dealerCards.length > 0 &&
              state.dealerCards.every(c => c.faceUp) &&
              handValue(state.dealerCards).value > 21;
            return dealerBusted ? 'dealerBust' : 'playerWin';
          }
          case 'lose': return 'dealerWin';
          case 'bust': return 'playerBust';
          case 'push': return 'push';
          default: return 'idle';
        }
      }
      default:
        return 'idle';
    }
  }, [state.phase, state.result, state.winStreak, state.showGenComplete, state.dealerCards]);

  if (!isVisible) return null;

  return (
    <div
      className="relative flex flex-col h-full w-full overflow-y-auto overflow-x-hidden bg-base font-sans items-center"
      style={{
        color: COLORS.textPrimary,
      }}
    >
      {/* ── Header ── */}
      <div className="w-full max-w-md flex items-center justify-between px-4 pt-3 pb-1">
        {/* Back + Win streak */}
        <div className="flex items-center gap-2">
          <button
            onClick={onExit}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-base shadow-neu-button hover:shadow-neu-button-active active:scale-95 transition-all"
            title="Back"
          >
            <ArrowLeft size={14} style={{ color: COLORS.textPrimary }} />
          </button>
          {state.winStreak > 0 && (
            <div className="flex items-center gap-1">
              <span style={{ fontSize: 14 }}>🔥</span>
              <span
                className="text-xs font-bold"
                style={{ color: state.winStreak >= 3 ? COLORS.textPrimary : COLORS.textSecondary }}
              >
                {state.winStreak}
              </span>
            </div>
          )}
        </div>

        {/* Chips */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: COLORS.textSecondary, opacity: 0.5 }}
          />
          <span className="text-xs font-bold" style={{ color: COLORS.textPrimary }}>
            {state.chips}
          </span>
        </div>
      </div>

      {/* ── Game Area — vertically centered between header and status bar ── */}
      <div className="w-full max-w-md flex-1 flex flex-col justify-center py-4 gap-4">

        {/* ── Dealer Area ── */}
        <div className="flex flex-col items-center pb-2">
          <DealerMascot expression={mascotExpression} streak={state.winStreak} />
        </div>

        {/* Dealer hand */}
        <div className="px-4">
          <Hand
            cards={state.dealerCards}
            label="Dealer"
            result={state.phase === 'resolved' ? (
              state.dealerCards.every(c => c.faceUp) && handValue(state.dealerCards).value > 21
                ? 'bust' : null
            ) : null}
            showValue={state.dealerCards.length > 0}
          />
        </div>

        {/* ── Table Divider -- neumorphic pressed line ── */}
        <div className="px-6">
          <div
            className="w-full rounded-full"
            style={{
              height: 3,
              background: COLORS.bg,
              boxShadow: 'var(--shadow-neu-pressed)',
            }}
          />
        </div>

        {/* ── Player Area ── */}
        <div className="flex flex-col items-center gap-1 px-4">
          {state.playerHands.map((hand, i) => (
            <Hand
              key={i}
              cards={hand.cards}
              label={state.playerHands.length > 1 ? `Hand ${i + 1}` : 'Your hand'}
              result={hand.result}
              isActive={state.phase === 'playerTurn' && i === state.activeHandIndex}
              showValue={hand.cards.length > 0}
            />
          ))}
        </div>

        {/* ── Refill message ── */}
        {state.showRefillMessage && (
          <div
            className="mx-4 px-3 py-2 rounded-full text-center text-[11px]"
            style={{
              background: COLORS.bg,
              color: COLORS.textSecondary,
              boxShadow: NEU_PRESSED,
              animation: 'bj-fade-in 0.3s ease',
            }}
          >
            {MASCOT_QUIPS.refill}
          </div>
        )}

        {/* ── Action Buttons (during player turn) ── */}
        {state.phase === 'playerTurn' && (
          <div className="px-4">
            <ActionButtons
              onHit={actions.hit}
              onStand={actions.stand}
              onDoubleDown={actions.doubleDown}
              onSplit={actions.split}
              canDoubleDown={actions.canDoubleDown()}
              canSplit={actions.canSplitHand()}
              disabled={state.phase !== 'playerTurn'}
            />
          </div>
        )}

        {/* ── Dealer Turn Indicator ── */}
        {state.phase === 'dealerTurn' && (
          <div className="flex items-center justify-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: COLORS.textPrimary,
                animation: 'bj-pulse 0.8s ease-in-out infinite',
              }}
            />
            <span className="text-xs" style={{ color: COLORS.textSecondary }}>
              Dealer's turn...
            </span>
          </div>
        )}

        {/* ── Game Result ── */}
        {state.phase === 'resolved' && (
          <div className="px-4">
            <GameResult
              result={state.result}
              message={state.resultMessage}
              onNewHand={actions.newHand}
              generationComplete={generationComplete}
            />
          </div>
        )}

        {/* ── Betting Phase ── */}
        {state.phase === 'betting' && (
          <div className="flex flex-col items-center gap-3 px-4">
            <ChipSelector
              currentBet={state.currentBet}
              chips={state.chips}
              onSelectBet={actions.placeBet}
              disabled={false}
            />
            <button
              onClick={actions.deal}
              disabled={state.currentBet > state.chips}
              className="w-full py-3 rounded-full text-sm font-bold uppercase tracking-wider transition-all active:scale-[0.97]"
              style={{
                background: COLORS.bg,
                color: COLORS.textPrimary,
                opacity: state.currentBet > state.chips ? 0.4 : 1,
                boxShadow: state.currentBet > state.chips ? 'none' : NEU_BTN,
                cursor: state.currentBet > state.chips ? 'not-allowed' : 'pointer',
                border: 'none',
              }}
              onMouseDown={(e) => {
                if (state.currentBet <= state.chips)
                  e.currentTarget.style.boxShadow = NEU_BTN_ACTIVE;
              }}
              onMouseUp={(e) => {
                if (state.currentBet <= state.chips)
                  e.currentTarget.style.boxShadow = NEU_BTN;
              }}
              onMouseLeave={(e) => {
                if (state.currentBet <= state.chips)
                  e.currentTarget.style.boxShadow = NEU_BTN;
              }}
            >
              Deal
            </button>
          </div>
        )}

      </div>

      {/* ── Status Bar ── */}
      <div className="w-full max-w-md px-4 pb-3 pt-2">
        <StatusBar
          renderTimeRemaining={renderTimeRemaining}
          onExit={onExit}
        />
      </div>

      {/* ── Generation Complete Overlay ── */}
      <GenerationComplete
        visible={state.showGenComplete}
        onViewResult={onExit}
      />

      {/* Global keyframes */}
      <style>{`
        @keyframes bj-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes bj-fade-in {
          0% { opacity: 0; transform: translateY(-4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default VFXBuddyBlackjack;
