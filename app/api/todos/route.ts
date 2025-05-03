import { NextResponse } from 'next/server';

// Define the expected structure of the response from the Rust backend
interface RustBackendResponse {
  categories: any[]; // Define more specific types if known
  // Add other fields if the Rust backend returns more data
}

export async function GET() {
  try {
    // Fetch data from the Rust backend API
    const rustBackendUrl = 'http://127.0.0.1:8080/todos';
    console.log(`Fetching data from: ${rustBackendUrl}`); // Log the URL being fetched
    const response = await fetch(rustBackendUrl, {
      cache: 'no-store', // Ensure fresh data is fetched every time
    });

    if (!response.ok) {
      const errorText = await response.text(); // Get error details from backend
      console.error(`Rust backend error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Rust backend API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Parse the JSON data from the Rust backend
    const data: RustBackendResponse = await response.json();

    console.log("Data fetched successfully from Rust backend."); // Log success

    // Return the data (already in the correct format expected by the frontend)
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching data from Rust backend:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching data';
    return NextResponse.json(
      { error: 'Failed to fetch todo data from backend service', details: errorMessage },
      { status: 500 }
    );
  }
} 