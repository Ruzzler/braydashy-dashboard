import { PetWrapper } from './PetWrapper';

// Latte Art Bowl — pixel art sprite sheet version
// Uses pre-generated sprite sheets in /pets/ directory

function LatteArtSprite({ walking }: { walking: boolean; phase: number; flipX: boolean }) {
    const basePath = `${import.meta.env.BASE_URL}pets/`;
    const spriteClass = walking ? 'pixel-pet-walk' : 'pixel-pet-idle';
    const spriteImage = walking ? `${basePath}latte_art_walk.png` : `${basePath}latte_art_idle.png`;

    return (
        <div
            className={`pixel-pet-sprite ${spriteClass}`}
            style={{
                backgroundImage: `url('${spriteImage}')`,
            }}
        />
    );
}

export function LatteArtPet() {
    return <PetWrapper>{(props) => <LatteArtSprite {...props} />}</PetWrapper>;
}
