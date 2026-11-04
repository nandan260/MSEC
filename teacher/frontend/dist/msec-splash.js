/*!
 * MS Engineering College — animated splash screen.
 * Self-contained: include with a plain <script src="msec-splash.js"></script> as early as
 * possible in <body>. It covers the page, plays the logo animation, then fades out.
 *
 *  - Plays once per browser session (sessionStorage). Add ?splash to the URL to force it.
 *  - Click / tap / any key skips it.
 *  - prefers-reduced-motion: shows the final logo briefly, no motion.
 *  - window.MSECSplash.play() replays it on demand.
 */
(() => {
  'use strict';
  const KEY = 'msec-splash-seen';
  const P = 'msec-sp-';
  const SVG = `<svg id="msec-sp-stage" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" aria-hidden="true"> <defs> <clipPath id="msec-sp-halfL" clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="639.5" height="1230"/></clipPath> <clipPath id="msec-sp-halfR" clipPathUnits="userSpaceOnUse"><rect x="637.5" y="0" width="700" height="1230"/></clipPath> <clipPath id="msec-sp-estdClip" clipPathUnits="userSpaceOnUse"> <rect id="msec-sp-estdWipe" class="msec-sp-o0" x="290" y="920" width="700" height="210"/> </clipPath> <clipPath id="msec-sp-msClip" clipPathUnits="userSpaceOnUse"><rect x="410" y="150" width="520" height="450"/></clipPath> <clipPath id="msec-sp-engClip" clipPathUnits="userSpaceOnUse"><rect x="980" y="238" width="1100" height="130"/></clipPath> <clipPath id="msec-sp-colClip" clipPathUnits="userSpaceOnUse"><rect x="980" y="368" width="1100" height="130"/></clipPath> </defs> <rect x="-4000" y="-4000" width="9920" height="9080" fill="#1E0033"/> <circle id="msec-sp-burstRedLead"   class="msec-sp-oc" cx="960" cy="702" r="2600" fill="#FF5A78"   style="transform:scale(0)"/> <circle id="msec-sp-burstRed"       class="msec-sp-oc" cx="960" cy="702" r="2600" fill="#F5012E"        style="transform:scale(0)"/> <circle id="msec-sp-ring"           class="msec-sp-oc" cx="960" cy="702" r="300"  fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0"/> <circle id="msec-sp-burstWhiteLead" class="msec-sp-oc" cx="960" cy="540" r="2600" fill="#FFD3DC" style="transform:scale(0)"/> <circle id="msec-sp-burstWhite"     class="msec-sp-oc" cx="960" cy="540" r="2600" fill="#FFFFFF"      style="transform:scale(0)"/> <g id="msec-sp-mark" class="msec-sp-us"> <g id="msec-sp-topL" class="msec-sp-us"><g clip-path="url(#msec-sp-halfL)"><g class="msec-sp-fillable" style="fill:#F5012E"><g transform="translate(0.000000,1230.000000) scale(0.100000,-0.100000)"><path d="M3265 11300 c-71 -5 -145 -12 -162 -15 l-33 -6 0 -1043 0 -1043 313 5 c297 4 478 -5 690 -34 l47 -7 0 606 c0 333 3 608 8 610 4 3 72 -4 152 -15 525 -69 997 -273 1425 -614 182 -145 313 -278 631 -641 l55 -63 142 168 c521 615 1063 970 1702 1113 99 22 341 59 393 59 l32 0 0 -611 0 -611 38 6 c219 33 342 41 670 40 l342 -1 0 1043 0 1042 -87 9 c-137 13 -712 9 -838 -5 -939 -109 -1682 -424 -2278 -967 l-118 -107 -62 58 c-554 523 -1262 855 -2102 983 -256 39 -706 58 -960 41z"/></g></g></g></g> <g id="msec-sp-topR" class="msec-sp-us"><g clip-path="url(#msec-sp-halfR)"><g class="msec-sp-fillable" style="fill:#F5012E"><g transform="translate(0.000000,1230.000000) scale(0.100000,-0.100000)"><path d="M3265 11300 c-71 -5 -145 -12 -162 -15 l-33 -6 0 -1043 0 -1043 313 5 c297 4 478 -5 690 -34 l47 -7 0 606 c0 333 3 608 8 610 4 3 72 -4 152 -15 525 -69 997 -273 1425 -614 182 -145 313 -278 631 -641 l55 -63 142 168 c521 615 1063 970 1702 1113 99 22 341 59 393 59 l32 0 0 -611 0 -611 38 6 c219 33 342 41 670 40 l342 -1 0 1043 0 1042 -87 9 c-137 13 -712 9 -838 -5 -939 -109 -1682 -424 -2278 -967 l-118 -107 -62 58 c-554 523 -1262 855 -2102 983 -256 39 -706 58 -960 41z"/></g></g></g></g> <g id="msec-sp-pageL" class="msec-sp-us"><g clip-path="url(#msec-sp-halfL)"><g class="msec-sp-fillable" style="fill:#F5012E"><g transform="translate(0.000000,1230.000000) scale(0.100000,-0.100000)"><path d="M8925 8689 c-996 -85 -1796 -419 -2418 -1010 l-118 -111 -92 89 c-598 577 -1405 927 -2342 1015 -156 14 -747 15 -830 1 l-50 -8 -3 -1576 -2 -1575 192 -12 c812 -52 1514 -299 2103 -740 321 -241 569 -492 976 -985 l46 -56 30 32 c16 18 69 82 118 142 428 531 797 870 1230 1130 498 300 1105 471 1750 493 l190 7 3 1576 2 1576 -67 7 c-122 11 -605 15 -718 5z m-4540 -985 c453 -89 914 -292 1272 -560 200 -151 419 -362 633 -612 52 -61 98 -111 101 -111 4 -1 35 34 70 76 510 619 991 956 1634 1146 146 44 392 95 492 104 l73 6 -2 -723 -3 -723 -100 -18 c-536 -92 -1057 -310 -1472 -616 -195 -144 -476 -399 -611 -553 l-75 -87 -206 206 c-590 591 -1170 903 -1946 1045 l-120 22 -3 710 c-1 390 0 714 2 720 5 12 92 1 261 -32z"/></g></g></g></g> <g id="msec-sp-pageR" class="msec-sp-us"><g clip-path="url(#msec-sp-halfR)"><g class="msec-sp-fillable" style="fill:#F5012E"><g transform="translate(0.000000,1230.000000) scale(0.100000,-0.100000)"><path d="M8925 8689 c-996 -85 -1796 -419 -2418 -1010 l-118 -111 -92 89 c-598 577 -1405 927 -2342 1015 -156 14 -747 15 -830 1 l-50 -8 -3 -1576 -2 -1575 192 -12 c812 -52 1514 -299 2103 -740 321 -241 569 -492 976 -985 l46 -56 30 32 c16 18 69 82 118 142 428 531 797 870 1230 1130 498 300 1105 471 1750 493 l190 7 3 1576 2 1576 -67 7 c-122 11 -605 15 -718 5z m-4540 -985 c453 -89 914 -292 1272 -560 200 -151 419 -362 633 -612 52 -61 98 -111 101 -111 4 -1 35 34 70 76 510 619 991 956 1634 1146 146 44 392 95 492 104 l73 6 -2 -723 -3 -723 -100 -18 c-536 -92 -1057 -310 -1472 -616 -195 -144 -476 -399 -611 -553 l-75 -87 -206 206 c-590 591 -1170 903 -1946 1045 l-120 22 -3 710 c-1 390 0 714 2 720 5 12 92 1 261 -32z"/></g></g></g></g> <g id="msec-sp-dot" class="msec-sp-oc"><g class="msec-sp-fillable" style="fill:#F5012E"><g transform="translate(0.000000,1230.000000) scale(0.100000,-0.100000)"><path d="M6225 3571 c-179 -51 -335 -195 -397 -366 -27 -74 -36 -251 -18 -334 64 -299 384 -502 690 -437 377 80 583 491 414 829 -126 251 -424 385 -689 308z"/></g></g></g> <g id="msec-sp-estd" clip-path="url(#msec-sp-estdClip)"><g class="msec-sp-ink" style="fill:#FFFFFF"><g transform="translate(0.000000,1230.000000) scale(0.100000,-0.100000)"><path d="M3452 2903 c-22 -33 -191 -299 -266 -422 -29 -47 -77 -124 -105 -171 l-53 -84 27 -21 c62 -50 492 -301 500 -293 12 12 75 124 75 132 0 6 -77 56 -170 111 -94 55 -170 104 -170 109 0 5 19 39 42 75 23 36 43 67 44 69 1 1 35 -17 75 -41 41 -25 109 -65 151 -90 l78 -47 40 63 c22 34 40 67 40 73 0 6 -63 48 -140 94 -77 45 -143 87 -146 92 -6 9 32 79 63 115 l18 22 160 -94 c88 -52 163 -95 167 -95 8 0 92 139 87 144 -2 2 -60 36 -129 76 -68 39 -177 103 -241 141 -135 80 -122 76 -147 42z M9110 2921 c-128 -39 -216 -148 -227 -281 l-6 -68 59 -7 c33 -3 71 -8 85 -11 25 -5 26 -3 32 49 11 108 68 162 147 138 80 -24 98 -101 60 -252 -20 -78 -52 -235 -65 -316 -6 -38 -3 -49 36 -108 24 -36 46 -65 49 -65 18 0 510 344 510 356 0 3 -21 35 -47 70 l-46 63 -76 -53 c-42 -29 -106 -73 -142 -99 -37 -26 -70 -47 -73 -47 -12 0 -5 45 30 182 44 171 44 236 -3 320 -60 107 -205 165 -323 129z M8512 2580 c-102 -21 -215 -116 -246 -207 -69 -202 83 -534 284 -620 143 -60 302 -25 406 90 126 141 86 409 -92 606 -93 102 -233 155 -352 131z m140 -200 c83 -55 188 -244 188 -338 0 -93 -85 -158 -172 -133 -100 30 -228 232 -228 360 0 117 114 176 212 111z M4086 2526 c-95 -35 -166 -134 -166 -231 0 -98 35 -155 156 -251 140 -111 159 -159 77 -202 -72 -39 -218 48 -259 154 -20 53 -13 52 -101 7 -82 -42 -83 -44 -47 -116 68 -135 276 -251 418 -232 186 24 290 200 211 360 -19 39 -45 69 -98 111 -133 108 -157 133 -157 169 0 116 188 82 252 -45 32 -63 26 -62 107 -15 67 39 70 48 42 103 -72 141 -298 239 -435 188z M4598 2279 c-19 -57 -23 -81 -15 -84 7 -3 57 -18 111 -35 55 -17 101 -31 102 -33 1 -1 -8 -40 -21 -87 -36 -134 -145 -534 -150 -547 -4 -13 106 -52 159 -56 33 -2 26 -21 137 393 34 129 65 238 69 242 3 4 55 -5 115 -21 61 -16 112 -27 114 -25 9 9 40 159 33 165 -4 3 -65 21 -137 39 -71 18 -208 54 -302 81 -95 27 -176 49 -181 49 -4 0 -20 -36 -34 -81z M7783 2300 c-263 -54 -353 -338 -202 -640 76 -152 184 -225 334 -225 281 0 417 259 297 567 -84 217 -253 334 -429 298z m111 -184 c105 -44 201 -313 153 -428 -29 -68 -119 -98 -187 -63 -101 52 -191 342 -138 441 31 56 105 78 172 50z M5344 2123 c-3 -27 -35 -214 -69 -416 -34 -202 -59 -370 -55 -372 30 -18 261 -49 370 -49 143 0 198 16 285 82 175 132 216 421 85 599 -73 100 -196 152 -430 183 -193 26 -178 28 -186 -27z m269 -164 c155 -24 217 -92 217 -237 0 -152 -74 -248 -205 -266 -44 -6 -181 14 -179 27 44 283 81 487 87 487 5 0 41 -5 80 -11z M6974 2119 c-85 -32 -184 -142 -184 -205 0 -15 143 -90 147 -77 55 163 264 176 251 17 -4 -48 -11 -61 -66 -126 -34 -40 -106 -132 -161 -204 l-99 -131 16 -77 15 -78 56 7 c73 9 441 71 509 85 50 11 53 13 48 38 -27 141 -27 143 -44 138 -9 -3 -75 -14 -147 -26 -71 -11 -142 -23 -157 -26 -42 -9 -36 3 74 131 144 170 175 253 139 378 -42 145 -232 220 -397 156z M6255 1912 c-106 -25 -131 -187 -35 -237 88 -45 190 14 190 110 0 79 -81 145 -155 127z M6212 1450 c-121 -74 -35 -267 102 -229 104 29 121 185 26 234 -40 21 -89 19 -128 -5z"/></g></g></g> </g> <g transform="translate(199 263) scale(0.7)" fill="#5C017D"> <rect id="msec-sp-bar" class="msec-sp-oc" x="940" y="234" width="12" height="268" style="transform:scaleY(0)"/> <g clip-path="url(#msec-sp-msClip)"> <g id="msec-sp-wM" style="transform:translateX(-560px)"><g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)"><path d="M6059 4671 c-35 -53 -104 -159 -154 -236 -51 -77 -145 -223 -210 -325 -64 -102 -134 -211 -155 -243 l-37 -59 -20 29 c-11 15 -61 93 -110 173 -96 154 -278 439 -323 505 -15 22 -57 86 -94 143 l-67 102 -314 0 -315 0 2 -1197 3 -1198 277 -3 277 -2 6 34 c4 19 4 263 1 543 -3 279 -3 599 1 711 l6 203 88 -133 c48 -73 139 -212 202 -308 64 -96 133 -200 154 -231 21 -30 71 -106 112 -167 46 -70 81 -112 91 -112 10 0 36 29 63 68 25 37 98 144 162 237 64 94 160 235 214 315 157 232 225 329 234 329 4 1 7 -334 7 -744 l0 -745 283 2 282 3 3 1198 2 1197 -152 1 c-84 0 -221 2 -305 3 l-152 3 -62 -96z"/></g></g> <g id="msec-sp-wS" style="transform:translateX(-560px)"><g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)"><path d="M7809 4800 c-453 -72 -720 -349 -719 -747 1 -384 189 -573 715 -718 481 -133 555 -173 555 -298 0 -147 -161 -224 -408 -197 -187 20 -351 88 -534 220 -53 39 -102 70 -107 70 -5 0 -31 -28 -57 -62 -26 -35 -70 -89 -96 -120 -75 -88 -168 -211 -168 -223 0 -30 209 -184 340 -250 87 -44 269 -105 390 -131 133 -29 464 -27 582 3 270 69 452 195 555 383 106 193 111 462 13 655 -102 202 -288 317 -705 439 -419 123 -479 154 -492 256 -8 55 2 85 43 130 90 100 314 101 543 4 99 -42 264 -134 276 -155 14 -22 36 -2 110 104 44 61 111 154 149 206 80 109 82 101 -25 184 -134 104 -325 186 -546 232 -90 20 -331 28 -414 15z"/></g></g> </g> <g clip-path="url(#msec-sp-engClip)"> <g class="msec-sp-ltr" data-row="eng" data-i="0"><g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)"><path d="M10001 4596 c-8 -10 -10 -146 -9 -497 l3 -484 370 0 370 0 0 100 0 100 -252 3 -253 2 0 99 0 99 216 1 c119 1 221 4 226 7 12 8 7 164 -5 182 -7 9 -64 12 -224 12 l-214 0 3 88 3 87 253 3 253 2 -3 103 -3 102 -361 3 c-297 2 -363 0 -373 -12z"/></g></g> <g class="msec-sp-ltr" data-row="eng" data-i="1"><g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)"><path d="M10950 4601 l-35 -6 0 -485 0 -485 110 0 110 0 2 100 c1 55 2 185 2 289 1 173 2 187 17 175 9 -7 77 -95 151 -194 73 -99 167 -224 209 -277 l75 -98 95 0 94 0 -2 493 -3 492 -75 3 c-41 2 -90 0 -107 -3 l-33 -6 0 -273 c0 -150 -3 -276 -6 -279 -4 -4 -40 37 -81 91 -41 53 -105 138 -143 187 -52 68 -186 246 -205 273 -5 6 -143 9 -175 3z"/></g></g> <g class="msec-sp-ltr" data-row="eng" data-i="2"><g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)"><path d="M12300 4604 c-368 -99 -492 -582 -220 -855 104 -105 224 -146 398 -137 114 6 172 24 267 83 122 75 116 60 113 291 l-3 199 -204 3 c-145 2 -208 -1 -218 -9 -10 -9 -13 -33 -11 -98 l3 -86 103 -3 103 -3 -3 -62 c-3 -61 -3 -62 -43 -82 -62 -31 -178 -33 -244 -5 -163 71 -215 296 -106 462 79 120 280 131 422 22 l32 -25 66 83 c36 45 65 86 65 90 0 11 -82 74 -127 97 -101 51 -276 66 -393 35z"/></g></g> <g class="msec-sp-ltr" data-row="eng" data-i="3"><g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)"><path d="M13025 4598 c-3 -7 -4 -229 -3 -493 l3 -480 110 0 110 0 0 490 0 490 -108 3 c-80 2 -109 -1 -112 -10z"/></g></g> <g class="msec-sp-ltr" data-row="eng" data-i="4"><g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)"><path d="M13380 4120 l0 -500 108 0 109 0 6 98 c4 53 7 187 7 297 l0 200 20 -25 c11 -14 113 -148 226 -297 l205 -273 95 0 94 0 -2 498 -3 497 -110 0 -110 0 -5 -280 -5 -280 -96 125 c-53 69 -149 196 -213 283 l-117 157 -104 0 -105 0 0 -500z"/></g></g> <g class="msec-sp-ltr" data-row="eng" data-i="5"><g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)"><path d="M14468 4633 c-17 -4 -18 -37 -18 -509 l0 -504 373 2 372 3 0 100 0 100 -258 3 -258 2 3 98 3 97 225 5 225 5 0 100 0 100 -227 3 -228 2 0 95 0 95 258 2 257 3 0 100 0 100 -355 1 c-195 1 -363 0 -372 -3z"/></g></g> <g class="msec-sp-ltr" data-row="eng" data-i="6"><g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)"><path d="M15407 4643 c-4 -3 -7 -235 -7 -515 l0 -508 375 0 375 0 0 105 0 105 -260 0 -261 0 3 98 3 97 228 3 227 2 0 105 0 105 -215 1 c-118 1 -221 2 -227 3 -9 1 -14 29 -16 94 l-3 92 188 2 c154 1 280 4 326 7 4 1 7 48 7 106 l0 105 -368 0 c-203 0 -372 -3 -375 -7z"/></g></g> <g class="msec-sp-ltr" data-row="eng" data-i="7"><g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)"><path d="M16357 4653 c-12 -19 -19 -467 -12 -737 l7 -297 117 3 116 3 3 163 2 162 70 0 69 0 87 -127 c48 -71 100 -145 116 -165 l30 -38 134 0 c74 0 134 2 134 5 0 2 -54 84 -121 182 -105 156 -118 179 -103 188 149 88 205 194 190 358 -15 164 -120 269 -296 297 -75 11 -537 14 -543 3z m487 -222 c128 -30 151 -198 34 -251 -35 -16 -66 -20 -165 -20 l-123 0 0 133 c0 74 2 136 5 139 10 9 208 8 249 -1z"/></g></g> <g class="msec-sp-ltr" data-row="eng" data-i="8"><g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)"><path d="M17395 4648 c-3 -13 -4 -248 -3 -523 l3 -500 120 0 119 0 2 505 c1 278 0 513 -2 523 -5 15 -19 17 -119 17 -111 0 -115 -1 -120 -22z"/></g></g> <g class="msec-sp-ltr" data-row="eng" data-i="9"><g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)"><path d="M17865 4658 c-3 -7 -4 -242 -3 -523 l3 -510 119 0 118 0 2 302 c1 166 4 304 7 307 5 5 164 -199 279 -359 28 -38 81 -111 118 -162 l67 -92 105 2 105 2 0 520 0 520 -120 0 -120 0 -5 -295 -5 -295 -75 98 c-41 54 -95 127 -120 162 -25 34 -91 124 -148 199 l-102 136 -110 0 c-79 0 -112 -4 -115 -12z"/></g></g> <g class="msec-sp-ltr" data-row="eng" data-i="10"><g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)"><path d="M19360 4671 c-350 -112 -500 -504 -313 -820 97 -162 254 -244 473 -244 162 0 280 39 398 132 l52 41 0 224 0 224 -27 6 c-43 8 -417 2 -430 -7 -18 -12 -18 -181 0 -195 7 -6 58 -13 113 -14 l99 -3 -3 -65 c-4 -75 -2 -72 -67 -96 -113 -43 -260 -18 -333 57 -165 168 -114 451 95 529 106 39 224 21 324 -52 l43 -31 46 50 c25 27 60 68 78 91 l33 41 -28 25 c-40 38 -149 92 -219 110 -86 22 -261 21 -334 -3z"/></g></g> </g> <g clip-path="url(#msec-sp-colClip)"> <g class="msec-sp-ltr" data-row="col" data-i="0"><g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)"><path d="M11836 3475 c-313 -79 -469 -449 -318 -754 129 -261 451 -354 724 -209 61 32 148 109 148 131 0 14 -133 147 -147 147 -4 0 -21 -13 -38 -29 -230 -223 -571 -4 -476 307 62 204 281 259 467 117 18 -14 37 -25 43 -25 16 0 142 153 139 170 -6 28 -125 108 -196 131 -88 28 -261 35 -346 14z"/></g></g> <g class="msec-sp-ltr" data-row="col" data-i="1"><g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)"><path d="M12840 3465 c-477 -154 -482 -841 -8 -1001 288 -98 592 52 689 338 25 74 26 240 3 319 -83 280 -395 437 -684 344z m287 -227 c184 -68 227 -352 75 -501 -60 -59 -108 -79 -193 -79 -245 0 -373 321 -203 510 87 98 187 120 321 70z"/></g></g> <g class="msec-sp-ltr" data-row="col" data-i="2"><g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)"><path d="M13783 3473 l-73 -4 0 -504 c0 -277 3 -506 8 -508 14 -10 667 -18 680 -9 9 6 12 36 10 113 l-3 104 -227 3 -228 2 -1 193 c-2 394 -6 594 -13 606 -4 6 -24 10 -44 9 -20 -1 -70 -4 -109 -5z"/></g></g> <g class="msec-sp-ltr" data-row="col" data-i="3"><g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)"><path d="M14590 3313 c0 -87 -3 -313 -6 -503 -5 -298 -4 -347 9 -358 11 -9 98 -12 358 -10 l344 3 3 108 3 107 -236 0 c-217 0 -235 1 -235 18 0 9 -2 190 -3 402 l-2 385 -117 3 -118 3 0 -158z"/></g></g> <g class="msec-sp-ltr" data-row="col" data-i="4"><g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)"><path d="M15477 3463 c-11 -11 -8 -1021 3 -1028 13 -8 747 -13 760 -5 7 4 10 46 8 111 l-3 104 -262 3 -263 2 0 94 c0 115 -18 107 243 106 106 0 198 -1 205 0 9 0 12 28 12 105 l0 105 -227 2 -228 3 -3 92 -3 93 258 2 258 3 0 105 0 105 -376 3 c-206 1 -378 -1 -382 -5z"/></g></g> <g class="msec-sp-ltr" data-row="col" data-i="5"><g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)"><path d="M16813 3475 c-193 -42 -358 -207 -397 -397 -81 -392 210 -708 605 -658 140 17 256 67 337 143 l32 31 0 217 c0 124 -4 220 -9 224 -14 8 -348 15 -404 8 l-48 -6 3 -101 3 -101 108 -3 107 -3 0 -70 0 -70 -47 -22 c-71 -33 -218 -32 -286 2 -126 62 -193 249 -142 400 20 62 93 142 155 170 89 40 242 20 325 -44 19 -14 38 -25 44 -25 12 0 141 160 141 175 0 13 -94 78 -143 99 -104 43 -267 56 -384 31z"/></g></g> <g class="msec-sp-ltr" data-row="col" data-i="6"><g transform="translate(0.000000,724.000000) scale(0.100000,-0.100000)"><path d="M17607 3463 c-13 -13 -8 -1018 5 -1031 17 -17 749 -17 766 0 20 20 16 204 -4 212 -9 3 -130 6 -270 6 l-254 0 0 95 c0 92 1 95 23 96 12 0 112 0 223 -1 240 -2 226 -9 222 121 l-3 94 -232 3 -233 2 0 95 0 95 254 0 c209 0 256 3 266 14 8 10 10 42 6 103 -3 48 -5 91 -6 96 0 9 -754 10 -763 0z"/></g></g> </g> </g> </svg>`;

  const CSS = `
    #${P}root { position: fixed; inset: 0; z-index: 2147483647; background: #1E0033;
      overflow: hidden; cursor: pointer; transition: opacity .5s ease; }
    #${P}root.${P}out { opacity: 0; pointer-events: none; }
    #${P}root svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; overflow: visible; }
    #${P}root .${P}oc { transform-box: fill-box; transform-origin: 50% 50%; }
    #${P}root .${P}o0 { transform-box: fill-box; transform-origin: 0 0; }
    #${P}root .${P}us { transform-box: view-box; transform-origin: 0 0; }
  `;

  const INTRO = 'translate(640.75px, 238px) scale(0.5)';     // big, centred
  const FINAL = 'translate(260.4px, 412.7px) scale(0.2058)';  // slot in the lockup
  const SPINE = 638.5;                                        // mark's vertical centre line
  const END = 6900;                                           // last animation ends here (ms)
  const ease = {
    out: 'cubic-bezier(.16,1,.3,1)',
    inOut: 'cubic-bezier(.77,0,.18,1)',
    softBack: 'cubic-bezier(.3,1.35,.6,1)',
  };
  const about = (x, y, t) => `translate(${x}px, ${y}px) ${t} translate(${-x}px, ${-y}px)`;

  let current = null;

  function play() {
    if (current) current.finish();
    if (!document.body) { document.addEventListener('DOMContentLoaded', play, { once: true }); return; }

    const style = document.createElement('style');
    style.textContent = CSS;
    const root = document.createElement('div');
    root.id = P + 'root';
    root.setAttribute('role', 'img');
    root.setAttribute('aria-label', 'MS Engineering College');
    root.innerHTML = SVG;
    document.head.appendChild(style);
    document.body.appendChild(root);

    const $ = id => root.querySelector('#' + P + id);
    const stage = root.querySelector('svg');
    const anims = [];
    const A = (el, kf, delay, duration, easing = ease.out, fill = 'both') =>
      anims.push(el.animate(kf, { delay, duration, easing, fill }));

    // Narrow screens: zoom to the lockup's width (x 260-1660) so the logo is not tiny.
    function frame() {
      const r = innerWidth / innerHeight;
      if (r >= 1400 / 1080) { stage.setAttribute('viewBox', '0 0 1920 1080'); return; }
      const h = 1400 / r;
      stage.setAttribute('viewBox', `260 ${540 - h / 2} 1400 ${h}`);
    }
    frame();
    addEventListener('resize', frame);

    const mark = $('mark');
    const fills = [...root.querySelectorAll('.' + P + 'fillable')];
    const ink = root.querySelector('.' + P + 'ink');
    mark.style.transform = INTRO;

    // 1. dot drops and bounces
    A($('dot'), [
      { transform: 'translateY(-1400px) scale(.7,1.4)', offset: 0 },
      { transform: 'translateY(0) scale(1.35,.65)', offset: .55, easing: ease.out },
      { transform: 'translateY(-180px) scale(.9,1.1)', offset: .78, easing: 'ease-in' },
      { transform: 'translateY(0) scale(1)', offset: 1 },
    ], 250, 900, 'cubic-bezier(.55,0,1,.45)');

    // 2. the book opens: two pages swing out from the spine, rising off the dot
    [['pageL', 0], ['pageR', 70]].forEach(([id, lag]) => A($(id), [
      { transform: about(SPINE, 857, 'translateY(60px) scale(0, .55)'), opacity: 0 },
      { transform: about(SPINE, 857, 'translateY(0) scale(1.05, 1)'), opacity: 1, offset: .65 },
      { transform: about(SPINE, 857, 'scale(1, 1)'), opacity: 1 },
    ], 1050 + lag, 700, ease.out));

    // 3. top chevron: halves slide in from either side and click together
    [['topL', -1], ['topR', 1]].forEach(([id, dir]) => A($(id), [
      { transform: `translateX(${dir * 520}px) rotate(${dir * 8}deg)`, opacity: 0 },
      { transform: 'translateX(0) rotate(0deg)', opacity: 1 },
    ], 1400, 650, ease.softBack));

    // 4. layered red burst from the dot; mark flips to white
    A($('burstRedLead'), [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], 2050, 750, ease.inOut);
    A($('burstRed'),     [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], 2150, 750, ease.inOut);
    A($('ring'), [
      { transform: 'scale(.4)', opacity: .8 },
      { transform: 'scale(1.8)', opacity: 0 },
    ], 2100, 950, ease.out, 'forwards');
    fills.forEach(f => A(f, [{ fill: '#F5012E' }, { fill: '#FFFFFF' }], 2200, 250, 'linear', 'forwards'));
    A(mark, [
      { transform: INTRO },
      { transform: `${INTRO} ${about(638, 604, 'scale(1.07)')}`, offset: .35 },
      { transform: INTRO },
    ], 2100, 650, ease.out);

    // 5. ESTD: 2002 sweeps in
    A($('estdWipe'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], 2550, 650, ease.inOut);

    // 6. layered white burst; brand colours return
    A($('burstWhiteLead'), [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], 3350, 800, ease.inOut);
    A($('burstWhite'),     [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], 3460, 800, ease.inOut);
    fills.forEach(f => A(f, [{ fill: '#FFFFFF' }, { fill: '#F5012E' }], 3650, 250, 'linear', 'forwards'));
    A(ink, [{ fill: '#FFFFFF' }, { fill: '#3D0177' }], 3650, 250, 'linear', 'forwards');

    // 7. mark travels to its slot in the lockup
    A(mark, [{ transform: INTRO }, { transform: FINAL }], 4100, 900, ease.inOut, 'forwards');

    // 8. divider grows, MS slides out from behind the mark, letters rise one by one
    A($('bar'), [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], 4750, 450, ease.out);
    A($('wM'), [{ transform: 'translateX(-560px)' }, { transform: 'translateX(0)' }], 4900, 800, ease.out);
    A($('wS'), [{ transform: 'translateX(-560px)' }, { transform: 'translateX(0)' }], 4960, 800, ease.out);
    root.querySelectorAll('.' + P + 'ltr').forEach(el => {
      const row = el.dataset.row === 'col' ? 1 : 0;
      const idx = Number(el.dataset.i);
      A(el, [{ transform: 'translateY(130px)' }, { transform: 'translateY(0)' }],
        5150 + row * 160 + idx * 35, 650, ease.softBack);
    });

    // 9. accent: the dot gives one small hop once everything has settled
    A($('dot'), [
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(0) scale(1.25,.75)', offset: .15 },
      { transform: 'translateY(-150px) scale(.92,1.1)', offset: .5, easing: 'ease-in' },
      { transform: 'translateY(0) scale(1.15,.85)', offset: .8 },
      { transform: 'translateY(0) scale(1)' },
    ], 6100, 700, 'ease-out', 'forwards');

    let timer;
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      root.classList.add(P + 'out');
      setTimeout(() => {
        anims.forEach(a => a.cancel());
        removeEventListener('resize', frame);
        removeEventListener('keydown', finish);
        root.remove();
        style.remove();
        if (current && current.root === root) current = null;
      }, 520);
    }

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      anims.forEach(a => { a.pause(); a.currentTime = 99999; });
      timer = setTimeout(finish, 1200);
    } else {
      timer = setTimeout(finish, END + 500);  // short hold on the finished logo
    }
    root.addEventListener('click', finish);
    addEventListener('keydown', finish);
    current = { root, finish };
    try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* storage blocked: still fine */ }
  }

  window.MSECSplash = { play };

  let seen = false;
  try { seen = sessionStorage.getItem(KEY) === '1'; } catch (e) { /* ignore */ }
  if (!seen || /[?&]splash\b/.test(location.search)) play();
})();
