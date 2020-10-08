import { Project, SourceFile, WriterFunction } from 'ts-morph';

export interface ITypeCreator {
  readonly project: Project;
  readonly sourceFile: SourceFile;

  generateDeconflictedName(baseName: string): string;
}
