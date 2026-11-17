/**
 * BEDROCK SNACK ATTACK — STAFF ROSTER
 * ------------------------------------
 * This is the one file to edit when you want to add or change people.
 *
 * Fields:
 *   id         Permanent, unique, lowercase, dashes only (e.g. "jane-doe").
 *              Never change an id after people have made requests — it links
 *              them to their snacks. To "remove" someone, hide them in the
 *              organizer page (/admin) instead of deleting them here.
 *   firstName  Shown under their photo and on every request.
 *   lastName   Used in the organizer page.
 *   photo      A file in /public/staff (e.g. "/staff/jane-doe.webp"),
 *              or null to show their initials in a colored circle.
 *
 * Photos: drop a square-ish JPG/PNG/WEBP into public/staff/, then set
 * photo: "/staff/your-file.jpg". Commit and push; Railway redeploys.
 *
 * How changes apply: every deploy runs `npm run db:setup`, which adds new
 * people from this list and updates existing ones — EXCEPT people you have
 * edited in the organizer page. Those keep the organizer's version, so a
 * deploy never undoes an admin change. Requests are never touched.
 *
 * Photos for the 10 people below come from mybedrock.church/our-leadership
 * (downloaded into public/staff; no hotlinking).
 */
export const staff = [
  { id: "blake-harcup", firstName: "Blake", lastName: "Harcup", photo: "/staff/blake-harcup.webp" },
  { id: "kelsie-harcup", firstName: "Kelsie", lastName: "Harcup", photo: "/staff/kelsie-harcup.webp" },
  { id: "cody-davenport", firstName: "Cody", lastName: "Davenport", photo: "/staff/cody-davenport.webp" },
  { id: "brett-wolff", firstName: "Brett", lastName: "Wolff", photo: "/staff/brett-wolff.webp" },
  { id: "daniel-paige", firstName: "Daniel", lastName: "Paige", photo: "/staff/daniel-paige.webp" },
  { id: "malia-fong", firstName: "Malia", lastName: "Fong", photo: "/staff/malia-fong.webp" },
  { id: "carolina-wolff", firstName: "Carolina", lastName: "Wolff", photo: "/staff/carolina-wolff.webp" },
  { id: "brooke-meeker", firstName: "Brooke", lastName: "Meeker", photo: "/staff/brooke-meeker.webp" },
  { id: "tronn-goehring", firstName: "Tronn", lastName: "Goehring", photo: "/staff/tronn-goehring.webp" },
  { id: "ryan-biolsi", firstName: "Ryan", lastName: "Biolsi", photo: "/staff/ryan-biolsi.webp" },

  // Example of someone who isn't on the church website (initials circle):
  // { id: "jane-doe", firstName: "Jane", lastName: "Doe", photo: null },
];
