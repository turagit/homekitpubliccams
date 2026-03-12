import path from 'path';

export const sourcePath = (base: string, sourceId: string): string => path.join(base, 'sources', sourceId);
