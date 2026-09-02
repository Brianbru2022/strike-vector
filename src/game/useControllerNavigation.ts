import React from 'react';

const SELECTOR = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])';

export function useControllerNavigation(enabled: boolean, onUsed: () => void): void {
  React.useEffect(() => {
    if (!enabled || typeof navigator.getGamepads !== 'function') return;
    let frame = 0;
    let previousMove = false;
    let previousAccept = false;
    const poll = () => {
      const pad = navigator.getGamepads().find(Boolean);
      if (pad) {
        const move = Boolean(pad.buttons[12]?.pressed || pad.buttons[13]?.pressed || pad.buttons[14]?.pressed || pad.buttons[15]?.pressed) || Math.abs(pad.axes[0] || 0) > 0.65 || Math.abs(pad.axes[1] || 0) > 0.65;
        const accept = Boolean(pad.buttons[0]?.pressed);
        if (move && !previousMove) {
          const controls = [...document.querySelectorAll<HTMLElement>(`.game-stage ${SELECTOR}`)].filter((element) => element.offsetParent !== null);
          if (controls.length) {
            const current = controls.indexOf(document.activeElement as HTMLElement);
            const backwards = Boolean(pad.buttons[12]?.pressed || pad.buttons[14]?.pressed || (pad.axes[0] || 0) < -0.65 || (pad.axes[1] || 0) < -0.65);
            controls[(current + (backwards ? -1 : 1) + controls.length) % controls.length].focus();
            onUsed();
          }
        }
        if (accept && !previousAccept && document.activeElement instanceof HTMLElement) {
          document.activeElement.click();
          onUsed();
        }
        previousMove = move;
        previousAccept = accept;
      } else {
        previousMove = false;
        previousAccept = false;
      }
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, [enabled, onUsed]);
}
