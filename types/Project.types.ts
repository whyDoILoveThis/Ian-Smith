interface Project {
  $id?: string;
  id?: string;
  title: string;
  description: string;
  moreInfo: string;
  demoUrl: string;
  screenshots: Screenshot[];
  screenshotUrls?: string[];
  screenshotFileIds?: (string | null)[];
  stack: string[];
}

interface Screenshot {
  url: string;
  fileId?: string | null;
}

interface Skill {
  $id?: string;
  id?: string;
  text: string;
  url: string;
  fileURL?: string;
  fileId?: string;
}