export const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>, setDemoUrl: (str:string) => void) => {
    const userInput = e.target.value;

    // Ensure that https:// is always present at the start of the URL
    if (!userInput.startsWith("https://")) {
      setDemoUrl("https://");
    } else {
      setDemoUrl(userInput);
    }
  };