'use client';

import { useState, useEffect } from 'react';
import { getBlockedStudents, unblockStudent, type BlockWithDetails } from '@/lib/actions/blocking';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Ban, Unlock } from 'lucide-react';
import { toast } from 'sonner';

export default function BlockedStudentsPage() {
  const [blocks, setBlocks] = useState<BlockWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlocks = async () => {
      setLoading(true);
      const result = await getBlockedStudents();
      if (result.error) {
         toast.error(result.error);
      } else {
         setBlocks(result.data || []);
      }
      setLoading(false);
    };

    fetchBlocks();
  }, []);

  const handleUnblock = async (blockId: string) => {
      setProcessing(blockId);
      const result = await unblockStudent(blockId, '/teacher/blocked');
      if (result.success) {
          toast.success('Unblocked student');
          // Optimistic update
          setBlocks(prev => prev.filter(b => b.id !== blockId));
      } else {
          toast.error(result.error || 'Failed to unblock');
      }
      setProcessing(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Blocked Students</h1>
        <p className="text-muted-foreground">
          Manage students who are blocked from enrolling in your classes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Blocked Students List</CardTitle>
          <CardDescription>
            These students cannot enroll in any of your classes until unblocked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </div>
          ) : blocks.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <Ban className="mb-2 h-10 w-10 opacity-20" />
                <p>No blocked students found.</p>
             </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Parent Name</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date Blocked</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blocks.map((block) => (
                  <TableRow key={block.id}>
                    <TableCell className="font-medium">
                      {block.student.first_name} {block.student.last_name}
                    </TableCell>
                    <TableCell>
                      {block.student.parent ? (
                          <div className="flex flex-col">
                             <span>{block.student.parent.first_name} {block.student.parent.last_name}</span>
                             <span className="text-xs text-muted-foreground">{block.student.parent.email}</span>
                          </div>
                      ) : (
                          <span className="text-muted-foreground italic">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {block.reason ? (
                        <span className="text-sm">{block.reason}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">No reason provided</span>
                      )}
                    </TableCell>
                    <TableCell>
                        {new Date(block.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                       <Button 
                         variant="outline" 
                         size="sm"
                         onClick={() => handleUnblock(block.id)}
                         disabled={processing === block.id}
                       >
                         {processing === block.id ? (
                             <Loader2 className="h-4 w-4 animate-spin" />
                         ) : (
                             <>
                               <Unlock className="mr-2 h-4 w-4" /> Unblock
                             </>
                         )}
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
