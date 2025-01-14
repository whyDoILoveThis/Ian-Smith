import React from "react";

const AboutMe = () => {
  return (
    <article className="flex flex-col items-center p-6 max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h1 className="text-5xl font-bold mb-8 text-center text-gray-900 dark:text-gray-100">
        About Me
      </h1>
      <div className="flex flex-col gap-6 text-lg text-gray-700 dark:text-gray-300">
        <p>
          Hi, I&apos;m Ian Thai Smith, a passionate Full-Stack React Developer
          with a love for creating dynamic and responsive web applications. With
          a strong background in both front-end and back-end development, I
          enjoy tackling complex problems and turning ideas into reality.
        </p>
        <p>
          I have experience working with a variety of technologies including
          JavaScript, TypeScript, React, Next.js, Node.js, and more. I&apos;m
          always eager to learn new skills and stay up-to-date with the latest
          industry trends.
        </p>
        <p>
          When I&apos;m not coding, you can find me exploring the outdoors,
          reading a good book, or spending time with family and friends.
          I&apos;m always open to new opportunities and collaborations, so feel
          free to reach out!
        </p>
      </div>
    </article>
  );
};

export default AboutMe;
