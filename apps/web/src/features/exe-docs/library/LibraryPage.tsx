import { useState } from 'react';
import {
  Box,
  Grid,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from '../../../components/PageHeader';
import { FolderSidebar, FolderConfig } from './FolderSidebar';
import { DocumentsTable, DocumentRowData } from './DocumentsTable';
import { EmployeeDocumentsModule } from './employeeDocs/EmployeeDocumentsModule';
import { DEMO_LIBRARY_DOCUMENTS, DEMO_LIBRARY_FOLDERS } from '../../../data/execDocsDemo';

const EMPLOYEE_DOCS_FOLDER = 'Employee Docs';


export function LibraryPage() {
  const [selectedFolder, setSelectedFolder] = useState('Policies');
  const [folders, setFolders] = useState<FolderConfig[]>(DEMO_LIBRARY_FOLDERS);
  const [documents, setDocuments] = useState<Record<string, DocumentRowData[]>>(DEMO_LIBRARY_DOCUMENTS);
  const [triggerUpload, setTriggerUpload] = useState(0);

  const handleCreateNewClick = () => {
    setTriggerUpload((prev) => prev + 1);
  };

  const headerActions = selectedFolder === EMPLOYEE_DOCS_FOLDER ? undefined : (
    <Button
      variant="contained"
      color="primary"
      startIcon={<AddIcon />}
      onClick={handleCreateNewClick}
      sx={{
        borderRadius: '20px',
        px: 3,
        py: 1,
        fontWeight: 700,
        textTransform: 'none',
        boxShadow: '0 4px 14px rgba(21, 101, 192, 0.3)',
        '&:hover': {
          boxShadow: '0 6px 20px rgba(21, 101, 192, 0.4)',
        },
      }}
    >
      Create New
    </Button>
  );

  return (
    <Box>
      <PageHeader
        title="Document Library"
        subtitle={
          selectedFolder === EMPLOYEE_DOCS_FOLDER
            ? 'HR employee files linked to your organization directory.'
            : 'Access and manage high-level corporate assets and strategy directives.'
        }
        breadcrumbs={[
          { label: 'Dashboard', to: '/exec-docs' },
          { label: 'Document Library' },
        ]}
        actions={headerActions}
      />

      <Grid container spacing={3}>
        {/* Left Side - Folder Hierarchy & States */}
        <Grid item xs={12} md={3}>
          <FolderSidebar
            selectedFolder={selectedFolder}
            onSelectFolder={setSelectedFolder}
            folders={folders}
            setFolders={setFolders}
            documents={documents}
            setDocuments={setDocuments}
            triggerUpload={triggerUpload}
          />
        </Grid>

        {/* Right Side - Documents */}
        <Grid item xs={12} md={9}>
          {selectedFolder === EMPLOYEE_DOCS_FOLDER ? (
            <EmployeeDocumentsModule />
          ) : (
            <DocumentsTable selectedFolder={selectedFolder} documents={documents} />
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
