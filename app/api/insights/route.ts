import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { auth } from '@/lib/auth';
import {
  getGroup, getDailyInsight, saveDailyInsight,
  getAllInsightBodies, createNotificationBatch, getAllInsights,
} from '@/lib/redis';
import { UserId, DailyInsight, GroupId } from '@/lib/types';

const OG_GROUP_ID = 'grp_og' as GroupId;

// GET — list all insights (OG members only)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check OG membership
  const ogGroup = await getGroup(OG_GROUP_ID);
  if (!ogGroup || !ogGroup.members.includes(session.user.id as UserId)) {
    return NextResponse.json({ error: 'OG members only' }, { status: 403 });
  }

  const insights = await getAllInsights();
  return NextResponse.json({ insights }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' },
  });
}

// POST — generate today's insight (OG members only, idempotent)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check OG membership
  const ogGroup = await getGroup(OG_GROUP_ID);
  if (!ogGroup || !ogGroup.members.includes(session.user.id as UserId)) {
    return NextResponse.json({ error: 'OG members only' }, { status: 403 });
  }

  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  // Check if already generated for today
  const existing = await getDailyInsight(today);
  if (existing) {
    return NextResponse.json({ insight: existing, cached: true });
  }

  // Get all previous insights to avoid repetition
  const previousBodies = await getAllInsightBodies();
  const previousContext = previousBodies.length > 0
    ? `\n\nIMPORTANT: Here are ALL previous daily insights. Your new insight MUST be completely different from all of these — different country/region, different topic, different clues:\n\n${previousBodies.map((b, i) => `${i + 1}. ${b}`).join('\n')}`
    : '';

  // Generate insight via Anthropic API
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are a GeoGuessr expert helping players improve their skills. Generate a unique daily insight about something specific to look out for when playing GeoGuessr.

The insight should cover ONE specific, actionable clue about a country, region, or area. Examples of good topics:
- Road markings or bollard styles unique to a country
- Language clues on signs (specific letter patterns, diacritical marks)
- Vegetation or landscape patterns that identify a region
- Car/vehicle types common in specific countries
- Unique infrastructure (power lines, road surfaces, fences)
- Google Street View camera artifacts/metadata clues
- Phone number formats visible on signs
- Architectural styles specific to regions
- Road driving direction indicators
- Sun position and shadow clues for hemisphere

${previousContext}

Respond in this exact JSON format (no markdown wrapping):
{
  "title": "Short catchy title (max 60 chars)",
  "body": "2-3 paragraphs of detailed, specific, actionable advice. Use specific examples. Include the country/region name. Mention what exactly to look for and why it's a reliable indicator. Keep it engaging and educational.",
  "imageSearchQuery": "A very specific Google Image search query that would find a good example photo of the clue described (e.g. 'bollards red white striped Netherlands road' or 'Japanese road markings diamond pattern')"
}`,
    }],
  });

  // Parse the response
  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  let parsed: { title: string; body: string; imageSearchQuery: string };
  try {
    parsed = JSON.parse(responseText);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }
  }

  // Search for an image using Google
  let imageUrl: string | null = null;
  let imageCaption: string | null = null;
  try {
    const searchQuery = encodeURIComponent(parsed.imageSearchQuery + ' GeoGuessr clue');
    const googleApiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

    if (googleApiKey && searchEngineId) {
      const searchRes = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${searchEngineId}&q=${searchQuery}&searchType=image&num=1&safe=active`
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.items?.[0]) {
          imageUrl = searchData.items[0].link;
          imageCaption = searchData.items[0].title || parsed.imageSearchQuery;
        }
      }
    }
  } catch {
    // Image search is optional — continue without image
  }

  // Save the insight
  const insight: DailyInsight = {
    date: today,
    title: parsed.title,
    body: parsed.body,
    imageUrl,
    imageCaption,
    createdAt: new Date().toISOString(),
  };
  await saveDailyInsight(insight);

  // Send notifications to all OG members
  const notifications = ogGroup.members.map(memberId => ({
    userId: memberId,
    type: 'daily_insight' as const,
    title: '🌍 Daily GeoGuessr Insight',
    body: parsed.title,
    data: { date: today },
  }));
  await createNotificationBatch(notifications);

  return NextResponse.json({ insight, cached: false });
}
