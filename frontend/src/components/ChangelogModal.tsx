import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import rawChangelog from '../../../CHANGELOG.md?raw';

export function ChangelogModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const [changelogData, setChangelogData] = useState<string>('');

    useEffect(() => {
        if (open && !changelogData) {
            setChangelogData(rawChangelog);
        }
    }, [open, changelogData]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-card/95 border-border backdrop-blur-2xl">
                <DialogHeader className="mb-4 pb-4 border-b border-border/50">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-3 tracking-tight">
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-mono border border-primary/20">
                            v{import.meta.env.VITE_APP_VERSION}
                        </span>
                        Release History
                    </DialogTitle>
                    <DialogDescription>
                        Recent updates, new features, and bug fixes for BrayDashy.
                    </DialogDescription>
                </DialogHeader>

                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary prose-code:text-emerald-500 prose-code:bg-emerald-500/10 prose-code:px-1 prose-code:rounded">
                    <ReactMarkdown>
                        {changelogData || "Loading changelog..."}
                    </ReactMarkdown>
                </div>
            </DialogContent>
        </Dialog>
    );
}
