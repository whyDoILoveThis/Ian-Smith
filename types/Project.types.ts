interface Project {
  uid: string
    id: string;
    title: string;
    description: string;
    moreInfo: string;
    demoUrl: string;
    screenshots: Screenshot[];
    stack: string[];
  }

  interface Screenshot {
    url: string;
    fileId?: string;
  }

  interface Skill {
    id: string;
    text: string;
    fileURL: string;
  }