// Demo build: the whole backend is fake/backend.js, a database in this
// browser. Written by tools/sync.mjs - edit the source site, not this.
import { createClient } from '../fake/backend.js';

export const supabase = createClient();
