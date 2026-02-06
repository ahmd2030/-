
import { NextResponse } from 'next/server';
import { generateFashionVariants } from '@/services/ai';

export async function POST(req: Request) {
    try {
        const { design, region } = await req.json();
        const data = await generateFashionVariants(region, design);
        return NextResponse.json(data);
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
