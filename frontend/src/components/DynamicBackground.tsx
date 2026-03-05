// Component for dynamic background selection

interface DynamicBackgroundProps {
    themeColor?: string;
    backgroundStyle?: string;
}

export function DynamicBackground({ themeColor, backgroundStyle = 'orbs' }: DynamicBackgroundProps) {

    if (backgroundStyle === 'none') {
        return <div className="fixed inset-0 w-screen h-screen -z-10 pointer-events-none bg-background transition-colors duration-500"></div>;
    }

    if (backgroundStyle === 'grid') {
        return (
            <div className="fixed inset-0 w-screen h-screen -z-10 pointer-events-none bg-background transition-colors duration-500 overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-10 dark:opacity-[0.05] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] text-primary"></div>
            </div>
        );
    }

    if (backgroundStyle === 'dots') {
        return (
            <div className="fixed inset-0 w-screen h-screen -z-10 pointer-events-none bg-background transition-colors duration-500 overflow-hidden">
                <div className="absolute inset-0 bg-dots-pattern opacity-20 dark:opacity-10 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] text-primary"></div>
            </div>
        );
    }

    if (backgroundStyle === 'waves') {
        return (
            <div className="fixed inset-0 w-screen h-screen -z-10 pointer-events-none bg-background transition-colors duration-500 overflow-hidden">
                <div className="absolute inset-0 bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
                    <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-primary opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem] clip-path-polygon"></div>
                </div>
            </div>
        );
    }

    // Default to Orbs
    const rootClass = themeColor === 'zinc' ? 'bg-muted-foreground' : 'bg-primary';

    return (
        <div className="background-orbs transition-colors duration-500 bg-background pointer-events-none overflow-hidden h-screen w-screen fixed inset-0">
            <div className={`orb orb-1 ${rootClass} transition-colors duration-700`}></div>
            <div className={`orb orb-2 ${rootClass} transition-colors duration-700`}></div>
            <div className={`orb orb-3 ${rootClass} transition-colors duration-700 delay-500`}></div>
        </div>
    );
}
