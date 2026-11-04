import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';

// Shared autonomous pet movement wrapper — all SVG pets use this
// Handles: wandering, direction flipping, emote bubbles, click interaction

interface PetWrapperProps {
    children: (props: { walking: boolean; phase: number; flipX: boolean }) => ReactNode;
}

function EmoteBubble({ emote }: { emote: string }) {
    return <div className="emote-bubble">{emote}</div>;
}

export function PetWrapper({ children }: PetWrapperProps) {
    const [x, setX] = useState(5 + Math.random() * 85);
    const [targetX, setTargetX] = useState(5 + Math.random() * 85);
    const [flipX, setFlipX] = useState(false);
    const [walking, setWalking] = useState(false);
    const [_waitTimer, setWaitTimer] = useState(80 + Math.random() * 120);
    const [emote, setEmote] = useState<string | null>(null);
    const [_emoteTimer, setEmoteTimer] = useState(0);
    const [phase, setPhase] = useState(0);
    const requestRef = useRef<number>();

    const update = useCallback(() => {
        setPhase(p => p + 1);

        if (!walking) {
            setWaitTimer(prev => {
                if (prev > 0) return prev - 1;
                const newTarget = 5 + Math.random() * 90;
                setTargetX(newTarget);
                setFlipX(() => newTarget > x);
                setWalking(true);
                return 0;
            });
        } else {
            setX(prev => {
                const dx = targetX - prev;
                if (Math.abs(dx) < 0.4) {
                    setWalking(false);
                    setWaitTimer(80 + Math.random() * 250);
                    if (Math.random() > 0.85) {
                        setEmote(['❤️', '☕', '♪', '💤', '✨'][Math.floor(Math.random() * 5)]);
                        setEmoteTimer(100);
                    }
                    return targetX;
                }
                return prev + (dx > 0 ? 1 : -1) * 0.12;
            });
        }

        setEmoteTimer(prev => {
            if (prev <= 0) return 0;
            if (prev === 1) setEmote(null);
            return prev - 1;
        });

        requestRef.current = requestAnimationFrame(update);
    }, [walking, targetX, x]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(update);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [update]);

    const handleClick = () => {
        setEmote('❤️');
        setEmoteTimer(100);
    };

    return (
        <div
            className="absolute pointer-events-auto cursor-pointer"
            style={{ left: `${x}%`, bottom: 0, transform: 'translate(-50%, 0)', zIndex: 10 }}
            onClick={handleClick}
        >
            {emote && <EmoteBubble emote={emote} />}
            {children({ walking, phase, flipX })}
        </div>
    );
}
