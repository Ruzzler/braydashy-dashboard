import { useState, useEffect, useRef, useCallback } from 'react';

type EntityType = 'bmo' | 'coffee';
type EntityState = 'idle' | 'walk' | 'blink' | 'water' | 'inflate';

interface Entity {
    id: string;
    type: EntityType;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    state: EntityState;
    flipX: boolean;
    speed: number;
    waitTimer: number;
    emote?: string | null;
    emoteTimer: number;
}

export function DesktopPet({ petType = "bmo" }: { petType?: "bmo" | "coffee_mug" | "both" }) {
    const [entities, setEntities] = useState<Entity[]>([]);
    const requestRef = useRef<number>();
    const previousTimeRef = useRef<number>();

    // Initial Entity Setup
    useEffect(() => {
        const initialEntities: Entity[] = [];

        if (petType === 'both') {
            initialEntities.push({
                id: 'bmo-1', type: 'bmo', x: 40, y: 0, targetX: 40, targetY: 0,
                state: 'idle', flipX: false, speed: 0.12, waitTimer: 100, emoteTimer: 0
            });
            initialEntities.push({
                id: 'coffee-1', type: 'coffee', x: 60, y: 0, targetX: 60, targetY: 0,
                state: 'idle', flipX: false, speed: 0.1, waitTimer: 150, emoteTimer: 0
            });
        } else {
            initialEntities.push({
                id: 'pet-1',
                type: petType === 'coffee_mug' ? 'coffee' : 'bmo',
                x: 50, y: 0, targetX: 50, targetY: 0,
                state: 'idle', flipX: false, speed: 0.12, waitTimer: 100, emoteTimer: 0
            });
        }

        setEntities(initialEntities);
    }, [petType]);

    const updateGame = useCallback((time: number) => {
        if (previousTimeRef.current !== undefined) {
            setEntities(prev => prev.map(entity => {
                const next = { ...entity };

                // Emote timer
                if (next.emoteTimer > 0) {
                    next.emoteTimer--;
                    if (next.emoteTimer === 0) next.emote = null;
                }

                // AI state machine
                if (next.state === 'idle') {
                    if (next.waitTimer > 0) {
                        next.waitTimer--;
                    } else {
                        // Pick a new target
                        next.targetX = 5 + Math.random() * 90;
                        next.state = 'walk';
                        next.flipX = next.targetX > next.x;
                    }
                } else if (next.state === 'walk') {
                    const dx = next.targetX - next.x;
                    if (Math.abs(dx) < 0.5) {
                        next.x = next.targetX;
                        next.state = 'idle';
                        next.waitTimer = 100 + Math.random() * 300;

                        // Random chance to emote
                        if (Math.random() > 0.9) {
                            next.emote = ['❤️', '!', '♪', '...'][Math.floor(Math.random() * 4)];
                            next.emoteTimer = 120;
                        }
                    } else {
                        next.x += (dx > 0 ? 1 : -1) * next.speed;
                    }
                }

                return next;
            }));
        }
        previousTimeRef.current = time;
        requestRef.current = requestAnimationFrame(updateGame);
    }, []);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(updateGame);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [updateGame]);

    const handleEntityClick = (id: string) => {
        setEntities(prev => prev.map(e => {
            if (e.id === id) {
                return { ...e, emote: '❤️', emoteTimer: 100 };
            }
            return e;
        }));
    };

    return (
        <div className="absolute top-0 w-full h-0 pointer-events-none z-50">
            {entities.map(entity => (
                <div
                    key={entity.id}
                    className="absolute pointer-events-auto cursor-pointer"
                    style={{
                        left: `${entity.x}%`,
                        bottom: 0,
                        transform: `translate(-50%, 0)`,
                        zIndex: 10
                    }}
                    onClick={() => handleEntityClick(entity.id)}
                >
                    {entity.emote && (
                        <div className="emote-bubble">{entity.emote}</div>
                    )}
                    <div className={entity.flipX ? '-scale-x-100 transition-transform duration-200' : 'transition-transform duration-200'}>
                        <div
                            className={`${entity.type}-sprite ${entity.state === 'walk' ? 'pet-walk' : 'pet-idle'}`}
                            style={{
                                backgroundImage: `url('/pets/${entity.type}_${entity.state === 'walk' ? 'walk' : 'idle'}.png')`,
                                transformOrigin: 'bottom center'
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
