# CHANGELOG

<details name="language" dir="ltr">
<summary> <a href="#!"><img src="docs/readme-svg/languages.svg" width="20" height="20" alt="" style="vertical-align:middle;display:inline-block;margin:0 4px 2px 0;pointer-events:none;"></a> فارسی </summary>

<div dir="rtl">

<br>

# <a href="#!"><img src="docs/readme-svg/sun.svg" width="24" height="24" alt="" style="vertical-align:middle;display:inline-block;margin:0 4px 3px 0;pointer-events:none;"></a> تغییرات Visual Noteblock Pitch (Bedrock)

<details>
<summary> <a href="#!"><img src="docs/readme-svg/flask.svg" width="20" height="20" alt="" style="vertical-align:middle;display:inline-block;margin:0 4px 2px 0;pointer-events:none;"></a> نسخه 1.1.0</summary>

### <a href="#!"><img src="docs/readme-svg/sparkles.svg" width="18" height="18" alt="" style="vertical-align:middle;display:inline-block;margin:0 4px 2px 0;pointer-events:none;"></a> امکانات اصلی
- نوت‌بلاک با رفتار کامل وانیلا و شناسه‌ی مستقل `notey:visual_noteblock_pitch`
- نمایشگرهای تورفته ۰٫۵ پیکسلی روی هر چهار وجه جانبی
- ۲۵ تکسچر گام/نت (۰۰ تا ۲۴)، قاب سوراخ‌دار و ۳۲ دیوار تونل
- تعویض نمایشگر فقط با ۲۴ Block Permutation و بدون کد اسکریپتی
- ۱۸ ساز، پاسخ به لبه‌ی صعودی رداستون، کوک، پارتیکل و صدای سر ماب
- ذخیره‌ی گام با استیت‌های `notey:octave` و `notey:semitone`
- کرفت: ۶ تخته + ۲ شیشه + ۱ رداستون (۱۷ رسپی برای رنگ‌های شیشه)

### <a href="#!"><img src="docs/readme-svg/tools.svg" width="18" height="18" alt="" style="vertical-align:middle;display:inline-block;margin:0 4px 2px 0;pointer-events:none;"></a> رفع اشکال و بهبودها
- رفع پرش تکسچر و ریست زودهنگام گام با رمزنگاری ×۱۳
- هم‌ترازی نمایشگرها و تونل‌ها و بسته‌شدن درز دید به داخل بلوک
- بازنویسی جدول سازها مطابق وانیلا و رفع باگ ساز باس
- به‌روزرسانی مانیفست‌ها و نسخه‌بندی پک منابع

### <a href="#!"><img src="docs/readme-svg/book.svg" width="18" height="18" alt="" style="vertical-align:middle;display:inline-block;margin:0 4px 2px 0;pointer-events:none;"></a> مستندات و بسته‌بندی
- README دوزبانه، مجوز MIT و اعتبار Vanilla Tweaks
- تغییر نام پروژه و بسته‌ی نصبی به `Visual Noteblock Pitch (Bedrock)`

</details>

<details>
<summary> <a href="#!"><img src="docs/readme-svg/flask.svg" width="20" height="20" alt="" style="vertical-align:middle;display:inline-block;margin:0 4px 2px 0;pointer-events:none;"></a> نسخه 1.0.0</summary>

### <a href="#!"><img src="docs/readme-svg/sparkles.svg" width="18" height="18" alt="" style="vertical-align:middle;display:inline-block;margin:0 4px 2px 0;pointer-events:none;"></a> انتشار اولیه
- فورک پروژه‌ی NoteBlockClone به‌عنوان یک ادان مستقل
- شناسه‌ی جدید بلاک و ریسورس‌پک اختصاصی
- ۲۵ تکسچر گام و ۲۴ Block Permutation اولیه
- بسته‌بندی اولین نسخه‌ی `.mcaddon`

### <a href="#!"><img src="docs/readme-svg/globe.svg" width="18" height="18" alt="" style="vertical-align:middle;display:inline-block;margin:0 4px 2px 0;pointer-events:none;"></a> سازگاری
- Minecraft Bedrock 26.0+ (موتور `1.26.x`)
- بدون نیاز به Experiment

</details>

</div>

</details>

---

<details open name="language" dir="ltr">
<summary> <a href="#!"><img src="docs/readme-svg/languages.svg" width="20" height="20" alt="" style="vertical-align:middle;display:inline-block;margin:0 4px 2px 0;pointer-events:none;"></a> English </summary>

<div dir="ltr">

<br>

# <a href="#!"><img src="docs/readme-svg/sun.svg" width="24" height="24" alt="" style="vertical-align:middle;display:inline-block;margin:0 4px 3px 0;pointer-events:none;"></a> Visual Noteblock Pitch (Bedrock) Changelog

<details>
<summary> <a href="#!"><img src="docs/readme-svg/flask.svg" width="20" height="20" alt="" style="vertical-align:middle;display:inline-block;margin:0 4px 2px 0;pointer-events:none;"></a> Version 1.1.0</summary>

### <a href="#!"><img src="docs/readme-svg/sparkles.svg" width="18" height="18" alt="" style="vertical-align:middle;display:inline-block;margin:0 4px 2px 0;pointer-events:none;"></a> Core Features
- Note Block with full vanilla behavior under the separate ID `notey:visual_noteblock_pitch`
- 0.5px-recessed displays on all four side faces
- 25 pitch/note textures (00–24), cut-out frame and 32 tunnel walls
- Display swapping driven purely by 24 Block Permutations, with no display script
- 18 instruments, rising-edge redstone response, tuning, particles and mob-head sounds
- Pitch storage via the `notey:octave` and `notey:semitone` block states
- Crafting: 6 planks + 2 glass panes + 1 redstone (17 recipes for the pane colors)

### <a href="#!"><img src="docs/readme-svg/tools.svg" width="18" height="18" alt="" style="vertical-align:middle;display:inline-block;margin:0 4px 2px 0;pointer-events:none;"></a> Fixes & Improvements
- Fixed texture skipping and early pitch reset with ×13 pitch encoding
- Aligned the displays and tunnel walls and closed the view into the block interior
- Rebuilt the instrument table against vanilla and fixed the bass instrument
- Updated manifests and resource-pack versioning

### <a href="#!"><img src="docs/readme-svg/book.svg" width="18" height="18" alt="" style="vertical-align:middle;display:inline-block;margin:0 4px 2px 0;pointer-events:none;"></a> Docs & Packaging
- Bilingual README, MIT license and Vanilla Tweaks credit
- Renamed the project and install package to `Visual Noteblock Pitch (Bedrock)`

</details>

<details>
<summary> <a href="#!"><img src="docs/readme-svg/flask.svg" width="20" height="20" alt="" style="vertical-align:middle;display:inline-block;margin:0 4px 2px 0;pointer-events:none;"></a> Version 1.0.0</summary>

### <a href="#!"><img src="docs/readme-svg/sparkles.svg" width="18" height="18" alt="" style="vertical-align:middle;display:inline-block;margin:0 4px 2px 0;pointer-events:none;"></a> Initial Release
- Forked from NoteBlockClone as a standalone add-on
- New block identifier and dedicated resource pack
- 25 pitch textures and the first 24 Block Permutations
- First `.mcaddon` package

### <a href="#!"><img src="docs/readme-svg/globe.svg" width="18" height="18" alt="" style="vertical-align:middle;display:inline-block;margin:0 4px 2px 0;pointer-events:none;"></a> Compatibility
- Minecraft Bedrock 26.0+ (engine `1.26.x`)
- No Experiments required

</details>

</div>

</details>
