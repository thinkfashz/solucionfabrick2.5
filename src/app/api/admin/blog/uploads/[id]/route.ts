import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

// GET: Listar archivos
export async function GET() {
  try {
    const { data, error } = await insforge.database
      .from('blog_uploads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Error fetching uploads' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Error in uploads GET:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar archivo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Obtener archivo para eliminar del storage
    const { data: file } = await insforge.database
      .from('blog_uploads')
      .select('file_url')
      .eq('id', id)
      .single();

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Eliminar de BD
    const { error } = await insforge.database
      .from('blog_uploads')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: 'Error deleting file' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in uploads DELETE:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
