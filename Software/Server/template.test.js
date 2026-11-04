import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';
import { describe, it, expect } from 'vitest';

describe('Unraid Template Validation (Shadow Test)', () => {
    it('should have the correct GHCR repository and registry for updates', async () => {
        const templatePath = path.join(process.cwd(), 'braydashy-docker-template.xml');
        const xml = fs.readFileSync(templatePath, 'utf8');
        const result = await parseStringPromise(xml);

        const repository = result.Container.Repository[0];
        const registry = result.Container.Registry[0];

        // Current Repository: ghcr.io/ruzzler/braydashy-dashboard:latest
        // Current Registry: https://github.com/Ruzzler/braydashy-dashboard/pkgs/container/braydashy-dashboard

        expect(repository).toBe('ghcr.io/ruzzler/braydashy-dashboard:latest');

        // Shadow Failure: We want to force a change to ghcr.io registry URL to fix the update detection issue.
        expect(registry).toContain('ghcr.io');
    });
});
