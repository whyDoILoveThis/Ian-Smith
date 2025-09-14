interface Header {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $databaseId: string;
  $tableId: string;

  header: string;
  tagline: string;
  imageUrl?: string | null;
}
