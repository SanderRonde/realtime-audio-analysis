import * as path from 'path';

export const PORT = 1270;
export const REDIRECT_PATH = '/redirect';
export const REDIRECT_URL = `http://localhost:${PORT}${REDIRECT_PATH}`;

export const DATA_DIR = path.join(__dirname, '../../', 'data');
export const ANALYSIS_DATA_FILE = path.join(DATA_DIR, 'analysis.json');
