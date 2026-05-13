import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yfbbruxqfzgetapbvrgd.supabase.co'
const supabaseKey = 'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'

export const supabase = createClient(supabaseUrl, supabaseKey) 
