# SurTaal Lyrics — निजी, बिना लॉगिन/क्रेडिट

यह एक static browser app है। कोई backend, login, API key, subscription या per-song credit नहीं है। ऑडियो ब्राउज़र में प्रोसेस होता है। पहली बार Transformers.js और चुना गया Whisper मॉडल इंटरनेट से डाउनलोड होते हैं; उसके बाद browser cache उपलब्ध होने पर दोबारा डाउनलोड कम हो सकता है।

## Android पर सबसे आसान तरीका (ऑनलाइन URL)
1. ZIP को unzip करें।
2. `index.html`, `app.js`, `manifest.webmanifest` और `sw.js` को किसी static HTTPS hosting पर अपलोड करें। GitHub Pages या Cloudflare Pages जैसे static hosting विकल्प इस्तेमाल कर सकते हैं।
3. वेबसाइट Chrome में खोलें। चाहें तो Chrome मेनू → **Add to Home screen** चुनें।
4. पहली बार इंटरनेट चालू रखें ताकि JS library और Whisper model डाउनलोड हो सके। फिर ऑडियो चुनें → भाषा चुनें → **Lyrics निकालें**।
5. TXT या SRT डाउनलोड करें। टेक्स्ट बॉक्स में पहचान की गलतियाँ सुधार सकते हैं।

## अपने डिवाइस/लोकल नेटवर्क पर चलाना
Android पर केवल `file://` से खोलने पर ES modules, model fetch और service worker प्रतिबंधित हो सकते हैं। इसलिए HTTP server के ज़रिए चलाएँ। Termux में:
```sh
pkg update
pkg install python
# ZIP को Termux की पहुँच वाली फ़ोल्डर में unzip करें
cd surtaal_lyrics
python -m http.server 8000
```
फिर उसी Android फोन में `http://127.0.0.1:8000` खोलें। अगर Termux/फ़ाइलें सेटअप करना कठिन हो तो HTTPS static hosting वाला तरीका आसान है। लोकल server पर भी पहली बार मॉडल डाउनलोड करने के लिए इंटरनेट चाहिए।

## जरूरी सीमाएँ
- Whisper Tiny हल्का है, लेकिन हिंदी/भोजपुरी गीतों के बोल गलत पहचान सकता है। गायकी और संगीत के साथ speech recognition की सटीकता सामान्य बातचीत से कम होती है।
- `whisper-base` अधिक मेमोरी/स्टोरेज ले सकता है। Android पर Tiny से शुरू करें।
- मोबाइल ब्राउज़र/OS background में tab बंद कर सकता है; स्क्रीन खुली रखें। लंबी फ़ाइलों को 2–5 मिनट के हिस्सों में बाँटना बेहतर है। इस संस्करण में अधिकतम 15 मिनट की सीमा है।
- टाइमस्टैम्प मॉडल के segment/chunk अनुमान हैं, प्रत्येक शब्द की सटीक karaoke timing नहीं। SRT में end time सरल अनुमान (+3 सेकंड) है।
- YouTube URL से ऑडियो डाउनलोड जानबूझकर शामिल नहीं किया गया है। URL से सीधे extraction अस्थिर हो सकता है और प्लेटफ़ॉर्म की शर्तों/कॉपीराइट का सवाल हो सकता है। अपनी वैध ऑडियो फ़ाइल अपलोड करें।
- ऐप shell cache होता है, पर CDN और मॉडल की पूर्ण offline उपलब्धता ब्राउज़र cache, स्टोरेज और model runtime पर निर्भर करती है। पहले इंटरनेट के बिना पहली बार उपयोग संभव नहीं है।
- कोई software 100% privacy guarantee नहीं दे सकता; इस कोड में आपकी ऑडियो को किसी custom backend पर भेजने का code नहीं है। Model/JS library CDN से आते हैं।

## मॉडल/लाइब्रेरी बदलना
`app.js` में Transformers.js version और model IDs दिए हैं। Model repository IDs/ONNX files समय के साथ बदल सकते हैं; अगर model load error आए तो README के साथ issue/console error देखकर supported multilingual ASR model ID अपडेट करें।
