import * as path from 'path';

export const PORT = 1270;
export const REDIRECT_PATH = '/redirect';
export const REDIRECT_URL = `http://localhost:${PORT}${REDIRECT_PATH}`;

export const DATA_DIR = path.join(__dirname, '../../../', 'data');
export const ANALYSIS_DATA_FILE = path.join(DATA_DIR, 'analysis.json');
export const URIS_DATA_FILE = path.join(DATA_DIR, 'uris.txt');
export const TRACK_DIR = path.join(DATA_DIR, 'tracks');
export const BRABANT = 'spotify:track:0GiWi4EkPduFWHQyhiKpRB';
