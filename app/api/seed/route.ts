// app/api/seed/route.ts
import { NextRequest, NextResponse } from 'next/server'
import seed from '@/scripts/seed'

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check here
    // const { user } = await getAuthUser()
    // if (!user || user.Role !== 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    console.log('🚀 Running seed from API...')
    await seed()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Data seeded successfully!' 
    })
  } catch (error) {
    console.error('❌ Seed error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to seed data' 
    }, { status: 500 })
  }
}