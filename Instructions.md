I want to build a website.  It will be called "Sound of Memory Test" by "Natalie Zhao".

This website will be used to conduct a memory test for a science project.

The initial landing page will have the following:
- Instructions on what this website is for
- Name of this experiment
- Natalie Zhao's name
- A big button to "Take the Test"

When "Take the Test" is pressed
- First we need to show a popup to prompt for some information from the user
- We will collect the following:
-- Name
-- Age
-- Gender
- We should also collect their IP address location via the browser
- There should be a button to "Start Test" once all the required info is filled in.

When "Start Test" is pressed, we will enter into the test page:
- The test will start by asking if the user is ready.  
- It should remind the user to put on a pair of headphones (recommended) and to go somewhere quiet.
- They can click a "Begin Test" button to start.
- Once the test starts, here's how it works:
-- It will count down from 3, 2, 1.
-- It will start to give the user random single digit numbers (1 number every 500ms).
-- The first round will consist of giving the user 5 numbers.
-- After the numbers are shown to the user, they will have 10 seconds to enter them back into the system correctly.
-- If successful, the test will proceed to the next round, which will increase the number of numbers by 1.  And so on and so forth.
-- The test ends when a user is unable to successfully repeat back all the numbers in a round.
-- All the data around the user interaction should be collected (how long it takes them to finish entering in numbers in a round, how many successful rounds, etc.)
- When a test completes, show the user a landing page that tells them:
-- Thank you for participating in our test, the test is complete.
-- Tell them their results
-- Show some confetti.
-- Have a return to main menu button

Technical details:
- Probably build this in Next.JS if you think there is a better choice, let me know.
- I think we will need a database to store results.  USe a local sqlite database to store this for now.
- We will eventually enhance this to also play sounds during each round... so keep that in mind when deciding the technology.