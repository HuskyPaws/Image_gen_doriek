'use client';

import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Project } from '@/lib/types';
import { MoreHorizontal, Images, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProjectCardProps {
  project: Project;
  onDelete: (projectId: string) => void;
  onEdit: (projectId: string) => void;
}

export function ProjectCard({ project, onDelete, onEdit }: ProjectCardProps) {
  const router = useRouter();

  function handleCardClick() {
    router.push(`/project?id=${project.id}`);
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <Card className="group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 hover:border-blue-300">
      <div onClick={handleCardClick}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-2 line-clamp-1">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(project.id)}>
                  Edit project
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(project.id)}
                  className="text-red-600 focus:text-red-600"
                >
                  Delete project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Images className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {project.imageCount} {project.imageCount === 1 ? 'image' : 'images'}
              </span>
              {project.imageCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {project.imageCount}
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Updated {formatDate(project.updatedAt)}
              </span>
            </div>
          </div>
        </CardContent>
      </div>

      <CardFooter className="px-6 py-4 pt-0">
        <div className="flex w-full justify-between items-center">
          <span className="text-xs text-slate-500">
            Created {formatDate(project.createdAt)}
          </span>
          <Button 
            size="sm" 
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="group-hover:bg-blue-50 group-hover:border-blue-300 group-hover:text-blue-700"
          >
            Open Project
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 