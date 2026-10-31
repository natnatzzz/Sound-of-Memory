export const consentSections = [
 {
  "heading": false,
  "text": "Student researcher: Natalie Zhao\nSchool: McCullough Junior High\nAdult supervisor: Katherine McLean — kmclean@conroeisd.net"
 },
 {
  "heading": true,
  "text": "What is this study about?"
 },
 {
  "heading": false,
  "text": "This science project explores how background music and noise affect short-term memory."
 },
 {
  "heading": true,
  "text": "What will I do?"
 },
 {
  "heading": false,
  "text": "You will watch digits appear on the screen and enter them in the same order. Each correct answer makes the next sequence longer and faster. You will repeat this activity in silence and with different background sounds."
 },
 {
  "heading": false,
  "text": "The test includes 8 sound conditions and takes approximately 10–15 minutes. The first six conditions appear in a random order, followed by two conditions using your best-performing sound with digit tones. Use headphones at a comfortable, consistent volume."
 },
 {
  "heading": true,
  "text": "Are there any risks or benefits?"
 },
 {
  "heading": false,
  "text": "You may experience mild frustration, tiredness, or discomfort from the sounds. Keep the volume comfortable. If you feel uncomfortable, stop the test or remove your headphones."
 },
 {
  "heading": false,
  "text": "There may be no direct benefit to you. Results may help us understand how background sound affects memory. This test does not diagnose a memory or learning condition."
 },
 {
  "heading": true,
  "text": "Do I have to participate?"
 },
 {
  "heading": false,
  "text": "No. Participation is entirely voluntary. You may decline or stop at any time without penalty or any effect on your grades or relationship with the school. Closing the test stops participation; contact the researcher if you also want your saved responses deleted."
 },
 {
  "heading": true,
  "text": "What happens to my information?"
 },
 {
  "heading": false,
  "text": "We collect your name, age, gender, digit sequences and answers, scores for each sound condition, response and test times, audio settings, and test events such as submissions and page visibility changes. We also record browser/device information supplied by your browser and, when available, your IP address and approximate city, region, and country. We do not request precise GPS location or record your microphone."
 },
 {
  "heading": false,
  "text": "After consent, the website uses ipapi.co to look up approximate location from your IP address. That provider receives your IP address. The participant test does not use advertising or tracking cookies. The researcher dashboard uses a sign-in cookie."
 },
 {
  "heading": false,
  "text": "Study data is stored in a secured cloud database accessible only to the researchers. Results will be reported in summaries without identifying individual participants. Consent records are stored separately from test responses and linked to your test session."
 },
 {
  "heading": false,
  "text": "Study data and consent records will be retained for one year after your participation, then deleted. To request earlier deletion, contact natalie.l.zhao@gmail.com with your participant name and approximate test date so the researcher can locate your records."
 },
 {
  "heading": true,
  "text": "Questions"
 },
 {
  "heading": false,
  "text": "For questions about the study or participation, contact Katherine McLean at kmclean@conroeisd.net."
 }
];
export const adultAgreement = "I have read the information above and had an opportunity to ask questions. I understand the activity, possible risks, and how my information will be used. I understand that participation is voluntary and I may stop at any time without penalty.";
export const guardianAgreement = "I have read the information above and had an opportunity to ask questions. I understand what my child will do, the possible risks, and how their information will be used. Participation is voluntary, and my child may stop at any time without penalty. I am this participant’s parent or legal guardian, and I give permission for my child to participate.";
export const consentStatement = ["Sound of Numbers: Participant Information and Consent", ...consentSections.map(s=>s.text), adultAgreement, guardianAgreement, "Participant agreement: I understand what I will do and want to participate. I can stop at any time.", "Typing my name and selecting Sign and agree records my digital signature."].join("\n\n");
