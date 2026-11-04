import { PetWrapper } from './PetWrapper';

// Espresso Shot — small glass with dark espresso, golden crema, coffee bean on top

function EspressoShotSVG({ walking, phase, flipX }: { walking: boolean; phase: number; flipX: boolean }) {
    const walkCycle = walking ? Math.sin(phase * 0.18) : 0;
    const leftLegAngle = walking ? walkCycle * 30 : 0;
    const rightLegAngle = walking ? -walkCycle * 30 : 0;
    const bodyBob = walking ? Math.abs(Math.sin(phase * 0.18)) * -2 : 0;
    const armAngle = walking ? walkCycle * 20 : 0;
    const idleFloat = walking ? 0 : Math.sin(phase * 0.06) * 1.5;
    const isBlinking = (phase % 120) > 114;
    const scale = flipX ? 'scale(-1,1)' : 'scale(1,1)';

    return (
        <svg width="65" height="90" viewBox="0 0 65 90"
            style={{ transform: `translateY(${bodyBob + idleFloat}px)` }}>
            <g transform={`translate(32, 45) ${scale} translate(-32, -45)`}>
                {/* Left Arm */}
                <g transform={`translate(10, 42) rotate(${armAngle}, 6, 0)`}>
                    <rect x="-8" y="-4" width="13" height="7" rx="3.5" fill="#0d9488" stroke="#0a7c72" strokeWidth="1.5" />
                </g>

                {/* Glass body (tapered) */}
                <path d="M14 18 L10 60 Q10 64 14 64 L50 64 Q54 64 54 60 L50 18 Z"
                    fill="#e3f2fd" stroke="#334155" strokeWidth="2.5" opacity="0.8" />
                {/* Espresso inside */}
                <path d="M15 24 L12 58 Q12 62 15 62 L49 62 Q52 62 52 58 L49 24 Z"
                    fill="#3e1e0a" />
                {/* Crema layer */}
                <rect x="15" y="22" width="34" height="8" rx="2" fill="#c8942a" />
                <rect x="17" y="23" width="18" height="3" rx="1.5" fill="#daa84c" opacity="0.6" />
                {/* Glass highlight */}
                <rect x="16" y="20" width="4" height="35" rx="2" fill="white" opacity="0.25" />

                {/* Coffee bean on top */}
                <ellipse cx="32" cy="16" rx="6" ry="4.5" fill="#4a2c17" stroke="#2d1a0e" strokeWidth="1.5" />
                <line x1="32" y1="12" x2="32" y2="20" stroke="#2d1a0e" strokeWidth="1.2" />

                {/* Face */}
                {isBlinking ? (
                    <><rect x="20" y="38" width="7" height="2" rx="1" fill="#f5f0e8" /><rect x="37" y="38" width="7" height="2" rx="1" fill="#f5f0e8" /></>
                ) : (
                    <><circle cx="24" cy="38" r="3.5" fill="#1e293b" /><circle cx="25.5" cy="36.5" r="1.1" fill="white" /><circle cx="40" cy="38" r="3.5" fill="#1e293b" /><circle cx="41.5" cy="36.5" r="1.1" fill="white" /></>
                )}
                <circle cx="17" cy="43" r="2.5" fill="#fda4af" opacity="0.55" />
                <circle cx="47" cy="43" r="2.5" fill="#fda4af" opacity="0.55" />
                {/* Confident smirk */}
                <path d="M26 48 Q32 53 40 48" fill="none" stroke="#f5f0e8" strokeWidth="2" strokeLinecap="round" />

                {/* Right Arm */}
                <g transform={`translate(50, 42) rotate(${-armAngle}, 0, 0)`}>
                    <rect x="-2" y="-4" width="13" height="7" rx="3.5" fill="#0d9488" stroke="#0a7c72" strokeWidth="1.5" />
                </g>

                {/* Glass bottom */}
                <rect x="12" y="62" width="40" height="4" rx="2" fill="#cfd8dc" stroke="#334155" strokeWidth="1.5" />

                {/* Legs */}
                <g transform={`translate(22, 66) rotate(${leftLegAngle}, 4, 0)`}>
                    <rect x="0" y="0" width="8" height="12" rx="4" fill="#0d9488" stroke="#0a7c72" strokeWidth="1.5" />
                    <rect x="-2" y="9" width="12" height="5" rx="2.5" fill="#0d9488" stroke="#0a7c72" strokeWidth="1.5" />
                </g>
                <g transform={`translate(36, 66) rotate(${rightLegAngle}, 4, 0)`}>
                    <rect x="0" y="0" width="8" height="12" rx="4" fill="#0d9488" stroke="#0a7c72" strokeWidth="1.5" />
                    <rect x="-2" y="9" width="12" height="5" rx="2.5" fill="#0d9488" stroke="#0a7c72" strokeWidth="1.5" />
                </g>
            </g>
        </svg>
    );
}

export function EspressoShotPet() {
    return <PetWrapper>{(props) => <EspressoShotSVG {...props} />}</PetWrapper>;
}
