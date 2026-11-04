import { PetWrapper } from './PetWrapper';

// Coffee Mug v2 — Classic white ceramic mug with D-handle, coffee inside rim

function MugV2SVG({ walking, phase, flipX }: { walking: boolean; phase: number; flipX: boolean }) {
    const walkCycle = walking ? Math.sin(phase * 0.18) : 0;
    const leftLegAngle = walking ? walkCycle * 30 : 0;
    const rightLegAngle = walking ? -walkCycle * 30 : 0;
    const bodyBob = walking ? Math.abs(Math.sin(phase * 0.18)) * -2 : 0;
    const leftArmAngle = walking ? walkCycle * 20 : 0;
    const rightArmAngle = walking ? -walkCycle * 20 : 0;
    const idleFloat = walking ? 0 : Math.sin(phase * 0.06) * 1.5;
    const blinkPhase = phase % 140;
    const isBlinking = blinkPhase > 134;
    const scale = flipX ? 'scale(-1,1)' : 'scale(1,1)';

    return (
        <svg width="80" height="100" viewBox="0 0 80 100"
            style={{ transform: `translateY(${bodyBob + idleFloat}px)` }}>
            <g transform={`translate(40, 50) ${scale} translate(-40, -50)`}>
                {/* Left Arm */}
                <g transform={`translate(16, 52) rotate(${leftArmAngle}, 8, 0)`}>
                    <rect x="-10" y="-4" width="14" height="8" rx="4" fill="#0d9488" stroke="#0a7c72" strokeWidth="1.5" />
                </g>
                {/* Rim */}
                <rect x="14" y="16" width="44" height="8" rx="2" fill="#e2e8f0" stroke="#334155" strokeWidth="2.5" />
                <rect x="16" y="18" width="40" height="5" rx="1" fill="#5c3a1e" />
                <rect x="18" y="19" width="20" height="2" rx="1" fill="#7c5230" opacity="0.6" />
                {/* Body */}
                <rect x="12" y="23" width="48" height="40" rx="5" fill="#f0f4f8" stroke="#334155" strokeWidth="2.5" />
                <rect x="14" y="23" width="44" height="4" rx="2" fill="#e2e8f0" />
                <rect x="15" y="28" width="6" height="28" rx="3" fill="white" opacity="0.5" />
                {/* Handle */}
                <path d="M60 30 Q76 30 76 43 Q76 56 60 56" fill="none" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
                <path d="M60 30 Q72 30 72 43 Q72 56 60 56" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
                {/* Eyes */}
                {isBlinking ? (
                    <><rect x="22" y="35" width="8" height="2.5" rx="1.25" fill="#1e293b" /><rect x="42" y="35" width="8" height="2.5" rx="1.25" fill="#1e293b" /></>
                ) : (
                    <><circle cx="26" cy="36" r="4" fill="#1e293b" /><circle cx="28" cy="34" r="1.2" fill="white" /><circle cx="46" cy="36" r="4" fill="#1e293b" /><circle cx="48" cy="34" r="1.2" fill="white" /></>
                )}
                {/* Blush */}
                <circle cx="20" cy="41" r="3.5" fill="#fda4af" opacity="0.65" />
                <circle cx="52" cy="41" r="3.5" fill="#fda4af" opacity="0.65" />
                {/* Smile */}
                <path d="M27 46 Q36 52 45 46" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
                {/* Right Arm */}
                <g transform={`translate(55, 52) rotate(${rightArmAngle}, 0, 0)`}>
                    <rect x="-2" y="-4" width="14" height="8" rx="4" fill="#0d9488" stroke="#0a7c72" strokeWidth="1.5" />
                </g>
                {/* Bottom */}
                <rect x="16" y="60" width="40" height="4" rx="2" fill="#d1d5db" stroke="#334155" strokeWidth="1.5" />
                {/* Legs */}
                <g transform={`translate(26, 64) rotate(${leftLegAngle}, 4, 0)`}>
                    <rect x="0" y="0" width="9" height="16" rx="4.5" fill="#0d9488" stroke="#0a7c72" strokeWidth="1.5" />
                    <rect x="-3" y="13" width="14" height="6" rx="3" fill="#0d9488" stroke="#0a7c72" strokeWidth="1.5" />
                </g>
                <g transform={`translate(45, 64) rotate(${rightLegAngle}, 4, 0)`}>
                    <rect x="0" y="0" width="9" height="16" rx="4.5" fill="#0d9488" stroke="#0a7c72" strokeWidth="1.5" />
                    <rect x="-3" y="13" width="14" height="6" rx="3" fill="#0d9488" stroke="#0a7c72" strokeWidth="1.5" />
                </g>
            </g>
        </svg>
    );
}

export function CoffeeMugV2Pet() {
    return <PetWrapper>{(props) => <MugV2SVG {...props} />}</PetWrapper>;
}
