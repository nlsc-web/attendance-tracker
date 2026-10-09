# StaffTrack — Attendance mark කරන විදිහ

මේ document එකෙන් app එක බලලා attendance mark කරන්න, check out කරන්න, සහ මාසය අවසානයේ summary එක ගන්න පුළුවන්. තිරයේ බොත්තම් ඉංග්‍රීසියෙන් තියෙන නිසා ඒ නම් ඒ විදිහටම ලියලා තියෙනවා.

Live app: https://attendance-tracker-d48e.onrender.com

කාර්යාලයේ PC, tablet, හෝ phone එකෙන් Chrome විවෘත කරලා ඒ link එක යන්න. උදේ මුලින්ම open කරන වෙලාවේ තත්පර 30–60ක් ගත වෙන්න පුළුවන්. ඒක app එක නිදාගෙන ඉන්න නිසා. ටිකක් ඉන්න.

---

## App එක මොකක්ද

StaffTrack කියන්නේ BSH staff attendance clock එක. කෙනෙක් තමන්ගේ නම තෝරලා **Check in** සහ **Check out** ඔබනවා. වෙලාව app එකේ clock එකෙන් ගන්නවා. අතින් වෙලාව type කරන්න ඕන නැහැ.

- වේලාව **Asia/Colombo** (ශ්‍රී ලංකා වේලාව).
- Shift එක පටන් ගන්නේ **8:30 AM**.
- Attendance records පටන් ගන්නේ **2026-10-08** දිනයෙන්.
- එක් කෙනෙකුට එක් දවසකට check-in එකක් සහ check-out එකක් විතරයි.
- Mark කරපු දත්ත server එකේ save වෙනවා. Excel file එක download කරනකොට ඒ දත්ත වලින් හදනවා.

Staff punch එකට PIN එකක් ඕන නැහැ. නම තෝරලා බොත්තම ඔබනවා විතරයි. වැරදි punch එකක් හදන්න, හෝ අමතක වුණු punch එකක් දාන්න, office login ඕන. ඒක පහළින් තියෙනවා.

---

## තිරයේ මොනවද තියෙන්නේ

උඩින් **StaffTrack** නම සහ දැන් වෙලාව (පැය : මිනිත්තු : තත්පර) සහ අද දිනය පෙන්වනවා.

ඊළඟට chip තුනක්:

| Chip | මොකක්ද කරන්නේ |
| --- | --- |
| **Shift 8:30 AM** | Shift start වෙලාව. මේක reminder එකක් විතරයි. |
| **Live** | App එක වැඩ කරනවා කියන සලකුණ. |
| **Download Excel** | සියලුම attendance Excel file එකක් විදිහට download කරනවා. |

Tabs දෙකක් තියෙනවා:

1. **Check in / out** (phone එකේ **Punch**) — දිනපතා mark කරන තිරය.
2. **Monthly summary** (phone එකේ **Summary**) — මාසයේ present, late, late minutes.

**Check in / out** tab එකේ කොටස් හතරක්:

1. **Record attendance** — නම තෝරලා Check in / Check out.
2. **Today’s punches** — අද mark වුණු ලැයිස්තුව. ඉහළින් count එකක් තියෙනවා.
3. **Not marked today** — අද තාම check-in නැති අය, සහ check-in කරලා තාම check-out නැති අය. දිනය වෙනස් කරලා පරණ දවසක් බලන්නත් පුළුවන්.
4. තේරුම් ගන්න ලේසි වෙන්න: card එකේ දකුණු උඩ කුඩා lock icon එක **Office login**.

---

## Attendance mark කරන පියවර

### උදේ Check in

1. App එක open කරන්න. **Check in / out** tab එක තියෙන්න ඕන.
2. **Type or select name** කියන තැන click කරන්න.
3. තමන්ගේ නම type කරන්න, නැත්නම් list එකෙන් තෝරන්න. Enter ඔබලාත් තෝරන්න පුළුවන්.
4. **Check in** බොත්තම ඔබන්න.
5. පණිවිඩය බලන්න:
   - **Checked in on time.** — වෙලාවට ආවා.
   - **Checked in — 10m late.** (උදාහරණයක්) — late. මිනිත්තු ගණන පෙන්වනවා.
6. නම තේරීම එකපාර clear වෙනවා. ඊළඟ කෙනාට තමන්ගේ නම තෝරන්න පුළුවන්.
7. **Today’s punches** ලැයිස්තුවේ ඒ නම, IN වෙලාව, සහ **On time** හෝ **Xm late** badge එක පෙනෙනවා.

Check in වෙලාව type කරන්න බෑ. බොත්තම ඔබන මොහොතේ Colombo වේලාව save වෙනවා.

### සවස Check out

1. ඒ නම ආයෙත් තෝරන්න.
2. **Check out** බොත්තම ඔබන්න.
3. **Checked out at 17:05:12** වගේ පණිවිඩයක් එනවා. ඒක check-out වෙලාව.
4. Today’s punches එකේ ඒ ticket එකේ **IN** සහ **OUT** දෙකම පෙනෙනවා.

Check out කරන්න කලින් අද check in කරලා තියෙන්න ඕන.

### නම ලැයිස්තුවට අලුත් කෙනෙක් එකතු කිරීම

1. Name box එකේ අලුත් නම type කරන්න.
2. List එකේ **Add** කියලා ඒ නම පෙනෙනවා.
3. ඒක තෝරන්න. ඊළඟ වතාවෙත් ඒ නම list එකේ තියෙනවා.

නම අකුරු 2 සිට 48 දක්වා. අකුරු, ඉලක්කම්, space, තිත, apostrophe, hyphen විතරයි යන්න පුළුවන්.

### නමක් ඉවත් කිරීම

1. Name list එක open කරන්න.
2. නම අසල තියෙන delete (කුණු බඳුන) බොත්තම ඔබන්න.
3. **Remove … from the name list?** කියලා අහනවා. ඔව් කියන්න.

මේකෙන් නම list එකෙන් යනවා. කලින් mark කරපු attendance records මකන්නේ නැහැ.

---

## වෙලාවට ආවාද, late ද

| Check-in වෙලාව | ප්‍රතිඵලය |
| --- | --- |
| 8:30 AM සිට 8:35 AM දක්වා | **On time** |
| 8:36 AM සහ ඊට පසු | **Late** |

Late මිනිත්තු ගණන 8:35 ට පසු ගත වුණු වෙලාව. උදාහරණ:

- 8:36 AM → 1m late
- 8:45 AM → 10m late
- 9:30 AM → 55m late

Ticket එකේ late නම් badge එක රතු පාට. On time නම් කොළ පාට. Late ගණනය වෙන්නේ **check-in වෙලාවෙන් විතරයි**. Check-out වෙලාව late එකට බලපාන්නේ නැහැ.

---

## App එක ඉඩ නොදෙන දේවල්

බොත්තම ඔබද්දී පණිවිඩයක් එනවා. ඒක කියවන්න.

| පණිවිඩය | තේරුම |
| --- | --- |
| Select your name first. | නම තෝරලා නැහැ. |
| Already checked in today. | අද දැනටමත් check in කරලා තියෙනවා. දෙවෙනි වතාවක් බෑ. |
| Check in first today. | අද check in නැතුව check out කරන්න හැදුවා. |
| Already checked out today. | අද check out දැනටමත් තියෙනවා. |
| Cannot check in. Check-out is required first — no check-out on … | කලින් දවසක check in කරලා check out කරලා නැහැ. අද check in කරන්න කලින් office login එකෙන් ඒ දවසේ check-out එක දාන්න ඕන. |

එක් දවසකට එක් නමකට punch එකක් විතරයි. Check-in වෙලාව වෙනස් කරන්න සාමාන්‍ය තිරයෙන් බෑ. වැරද්දක් නම් office login එකෙන් remove කරලා නැවත mark කරන්න.

---

## Not marked today

මේ කොටසෙන් බලන්න පුළුවන් කවුද තාම mark කරලා නැත්තේ.

- **No check-in** — list එකේ ඉන්න, අද IN වෙලාවක් නැති අය.
- **No check-out** — IN තියෙන, OUT නැති අය. ඔවුන්ගේ IN වෙලාව chip එකේ පෙනෙනවා.

උඩ දිනය වෙනස් කරලා වෙන දවසක් බලන්න පුළුවන්. දිනය අද නම් heading එක **Not marked today**. වෙන දවසක් නම් **Not marked 8 Oct** වගේ.

නමක් මත click කළාම ඒ නම උඩ name box එකට යනවා. ඊට පස්සේ Check in හෝ Check out ඔබන්න පුළුවන්. Office login unlock කරලා තියෙනවා නම්, ඒ දිනය missed-punch date එකටත් යනවා.

---

## Office login — වැරදි සහ අමතක වුණු punch

සාමාන්‍ය staff ට අද වෙලාවෙන් විතරයි mark කරන්න පුළුවන්. පරණ දවසක්, වැරදි වෙලාවක්, හෝ අමතක වුණු check-out එකක් හදන්නේ office login එකෙන්.

Unlock කරන්න පුළුවන් කෙනා: **Mrs.Lakmali**. PIN එක office එකේ තියාගන්න. Document එකේ PIN එක ලියලා නැහැ.

1. **Record attendance** card එකේ දකුණු උඩ lock icon එක click කරන්න.
2. PIN එක දාලා **Unlock** ඔබන්න.
3. වැරදි PIN 5 වතාවක් නම් මිනිත්තු 15ක් බලාගෙන ආයෙත් උත්සාහ කරන්න.
4. Unlock වුණාම මිනිත්තු 30ක් වලංගුයි. ඊට පස්සේ ආයෙත් PIN දාන්න ඕන.
5. ඉවර වුණාම **Done** ඔබන්න.

Unlock වුණාම Today’s punches එකේ සෑම ticket එකකම බොත්තම් දෙකක් එනවා:

| බොත්තම | මොකක්ද වෙන්නේ |
| --- | --- |
| **Undo out** | Check-out වෙලාව විතරක් මකනවා. Check-in එක තියෙනවා. Check-out තියෙනවා නම් විතරක් පෙනෙනවා. |
| **Remove** | ඒ දවසේ ඒ කෙනාගේ punch එක මුළුමනින්ම මකනවා (IN සහ OUT දෙකම). |

දෙකම confirm අහනවා. ඔව් කිව්වාම විතරක් මකනවා.

### අමතක වුණු punch එකක් දැමීම

Unlock වුණාට පස්සේ **Save missed punch** කොටස පෙනෙනවා.

1. නම තෝරන්න.
2. **Date** — අද හෝ කලින් දවසක්. අනාගත දිනයක් බෑ. 2026-10-08 ට කලින් දිනයක් බෑ.
3. **Check in** සහ/හෝ **Check out** වෙලාව දාන්න. එකක් වත් දාන්න ඕන.
4. Check-out, check-in ට කලින් වෙන්න බෑ.
5. **Save missed punch** ඔබන්න.

නීති:

- ඒ දවසේ check-in දැනටමත් තියෙනවා නම් අලුත් check-in වෙලාවක් දාන්න බෑ. **Already checked in that day.**
- Check-out දැනටමත් තියෙනවා නම් ආයෙත් check-out දාන්න බෑ.
- Check-in නැති දවසකට check-out විතරක් දාන්න බෑ. Check-in වෙලාවත් දාන්න ඕන.
- කලින් දවසක check-out නැති punch එකක් තියෙනවා නම්, ඊට පසු දවසකට අලුත් check-in දාන්න කලින් ඒ check-out එක දාන්න ඕන.

Late ගණනය missed check-in වෙලාවෙන්ම කරනවා. 8:36 හෝ ඊට පසු නම් late.

### එක් දවසක punches සියල්ල මකන්න

Office login unlock කරලා, date එක තෝරලා, **Clear this day's punches** ඔබන්න. Confirm කළාම ඒ දවසේ **සියලුම** staff punches මැකෙනවා. ආපසු ගන්න බෑ.

---

## Monthly summary

1. **Monthly summary** tab එක click කරන්න.
2. උඩ month dropdown එකෙන් මාසය තෝරන්න.
3. උඩින් එකතුව පෙනෙනවා:
   - **Check-ins** — ඒ මාසේ මුළු present දින ගණන (සියලුම අය එකතුව).
   - **Late arrivals** — late check-in ගණන.
   - **Late by** — late මිනිත්තු එකතුව (උදා: 2h 15m).
4. වගුවේ එක් එක් කෙනාගේ **Present**, **Late**, **Late by** තියෙනවා.

Present කියන්නේ check-in තියෙන දවස් ගණන. Check-out නැති දවසක් present ලෙස ගණන් වෙනවා.

### Excel ගන්න විදිහ

| බොත්තම | තියෙන්නේ | File එකේ මොනවද |
| --- | --- | --- |
| **Download Excel** | උඩ chip එක | සම්පූර්ණ workbook එක. මාස summary tabs, දිනපතා IN/OUT grid, All Punches log. |
| **Download summary** | Monthly summary tab එක | තෝරපු මාසයේ summary එක විතරයි. |

Excel එකේ එක් එක් දවසට **IN** සහ **OUT** තීරු දෙකක්. On time IN කොළ පාට. Late IN රතු පාට. OUT නිල් පාට.

Download කරන file එක database එකෙන් ඒ මොහොතේ හදනවා. Laptop එකේ පරණ `data` folder එකෙන් නෙවෙයි.

---

## දිනපතා පාවිච්චිය — කෙටි සාරාංශය

**Staff (සෑම කෙනෙක්ම)**

1. App එක open කරන්න.
2. නම තෝරන්න.
3. උදේ **Check in**.
4. යනකොට නම ආයෙත් තෝරලා **Check out**.
5. පණිවිඩය on time ද late ද කියලා බලන්න.

**Office (Mrs.Lakmali)**

1. Lock icon → PIN → Unlock.
2. වැරදි ticket එකක **Undo out** හෝ **Remove**.
3. අමතක වුණු දවසකට නම, දිනය, වෙලාව දාලා **Save missed punch**.
4. **Done** ඔබලා lock කරන්න.
5. මාසය අවසානයේ **Monthly summary** → මාසය → **Download summary**.

---

## App එක කෙනෙක් බලාගෙන තේරුම් ගන්න එක

තිරය උඩ සිට පහළට කියවන්න:

1. **ඔරලෝසුව** — දැන් Colombo වේලාව. Punch එක මේ වෙලාවෙන් save වෙනවා.
2. **Shift 8:30 AM** — 8:35 දක්වා on time. 8:36 සිට late.
3. **නම** — කාගේ punch එකද කියලා. තෝරන්නේ නැත්නම් බොත්තම් වැඩ කරන්නේ නැහැ.
4. **Check in / Check out** — අද mark කරන තැන. Check in කලින්, check out පසුව.
5. **පණිවිඩ පේළිය** — සාර්ථකද, late ද, ඇයි බැරිද කියනවා. බොත්තම ඔබාට පස්සේ මෙතන බලන්න.
6. **Today’s punches** — අද හරි mark වුණාද කියලා තහවුරු කරන ලැයිස්තුව.
7. **Not marked** — තාම නැති අය. මෙතනින් අමතක වුණු කෙනා හොයාගන්න.
8. **Lock** — සාමාන්‍ය punch එකට ඕන නැහැ. හදන්න, මකන්න, පරණ දවසක් දාන්න විතරයි.
9. **Monthly summary** — වැටුප් හෝ මාස අවසාන වාර්තාව. Present, Late, Late by.

එක් punch එකක් කියන්නේ එක් නමකට එක් දවසක IN වෙලාව සහ OUT වෙලාව. IN නැතිව OUT තියෙන්න බෑ. ඊළඟ දවසේ IN දාන්න කලින් කලින් දවසේ OUT තියෙන්න ඕන.
