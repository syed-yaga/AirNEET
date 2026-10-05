import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { StudySession } from '@/lib/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const STUDY_LOG_FILE = path.join(DATA_DIR, 'study_log.json');
const ARCHIVE_FILE = path.join(DATA_DIR, 'study_logs_archive.json');

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as Partial<StudySession>;

    if (!payload.studentName) {
      payload.studentName = 'Sifat';
    }
    if (!payload.timestamp) {
      payload.timestamp = new Date().toISOString();
    }
    if (!payload.subject) {
      payload.subject = 'Biology (Class 11)';
    }
    if (!payload.chapter) {
      payload.chapter = 'Ch 9: Biomolecules';
    }
    if (!payload.metrics) {
      payload.metrics = {
        totalInteractions: payload.rawHistory ? payload.rawHistory.length : 0,
        weakTopicsIdentified: [],
      };
    }

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // 1. Write the primary study_log.json (as per exact PRD format)
    fs.writeFileSync(STUDY_LOG_FILE, JSON.stringify(payload, null, 2), 'utf-8');

    // 2. Append to archive of sessions so history is preserved
    let archive: StudySession[] = [];
    if (fs.existsSync(ARCHIVE_FILE)) {
      try {
        archive = JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf-8'));
      } catch (e) {
        archive = [];
      }
    }
    archive.unshift(payload as StudySession);
    fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(archive, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Session successfully saved to local study_log.json',
      session: payload,
    });
  } catch (error) {
    console.error('Error saving study log:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    if (fs.existsSync(STUDY_LOG_FILE)) {
      const data = fs.readFileSync(STUDY_LOG_FILE, 'utf-8');
      return NextResponse.json(JSON.parse(data));
    }
    return NextResponse.json(null);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read study log' }, { status: 500 });
  }
}
