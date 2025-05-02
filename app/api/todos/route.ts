import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

export async function GET() {
  try {
    // Run the Rust program to generate fresh todo data
    await execPromise('cargo run', { cwd: process.cwd() });
    
    // Read the generated JSON file
    const filePath = path.join(process.cwd(), 'unitodo.sync.json');
    const jsonData = await fs.readFile(filePath, 'utf-8');
    
    // Parse the JSON data
    const data = JSON.parse(jsonData);
    
    // Return the parsed data directly
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating or reading todo data:', error);
    // Check if error is an object and has a message property before accessing it
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load todo data', details: errorMessage },
      { status: 500 }
    );
  }
} 