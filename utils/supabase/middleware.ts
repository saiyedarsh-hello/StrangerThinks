// DEPRECATED: Supabase middleware client migrated to TiDB backend architecture
import { type NextRequest, NextResponse } from "next/server";

export const createClient = (_request: NextRequest) => NextResponse.next();
