# Sır Bende: yeni soru yazma görevi

Bu dosya, zamanlanmış Claude görevinin her çalışmada izleyeceği talimattır. Amaç: uygulamanın "Sınırsız" modu için
**her seferinde yaklaşık 40 yeni, doğru ve özgün soru** yazıp `sorular.json` dosyasına eklemek. Uygulama bu dosyayı
arka planda okuyup soru havuzuna katar.

## Yapılacaklar (sırayla)

1. Depo güncel olsun (`git pull`). Sonra durumu gör:
   - `node birlestir.mjs --say` → kategorilere göre kaç soru var. Az olan kategorilere ağırlık ver.
   - `node birlestir.mjs --son 150` → son eklenen soruların metni. Aynı bilgiyi yeniden sorma.
   - `node birlestir.mjs --mevcut` → uygulamanın içindeki hazır 120 soru ve cevapları. Bunların aynısını ya da aynı bilgiyi başka sözcüklerle sorma.
2. Yaklaşık 45 soru yaz ve `yeni.json` dosyasına koy (bu dosya depoya eklenmez, iş bitince silinir). Biçim:
   `[{"k":0,"q":"Soru metni?","o":["A şıkkı","B şıkkı","C şıkkı","D şıkkı"],"a":2}]`
   - `k` kategori no: 0 Tarih, 1 Coğrafya, 2 Bilim, 3 Kültür ve Sanat, 4 Spor, 5 Doğa
   - `a` doğru şıkkın sırası (0-3). Şıkları karıştırmakla uğraşma, araç eklerken karıştırır.
3. `node birlestir.mjs yeni.json` çalıştır. Araç kural dışı ve tekrar soruları `RED` satırlarıyla bildirir.
   Reddedilenleri düzelt ya da at. Eklenen sayısı 30'dan azsa yeni sorular yazıp tekrarla (en fazla 3 tur).
4. `git add sorular.json`, `git commit -m "Yeni sorular (N)"`, `git push origin main`.
   Başka hiçbir dosyayı değiştirme. `yeni.json` dosyasını sil.
5. Sonunda tek satır rapor ver: kaç soru eklendi, dosyada toplam kaç soru var.

## Kalite kuralları (çok önemli: yanlış bilgi uygulamayı bozar)

- Yalnızca **kesin ve doğrulanabilir** bilgileri sor. Emin olmadığın bir soruyu yazma. Şüphen varsa WebSearch ile
  doğrula ya da soruyu at. Az ama doğru soru, çok ama şüpheli sorudan iyidir.
- Tek bir doğru cevap olsun. Tartışmalı, yoruma açık ya da "en iyi/en güzel" türü sorular yazma.
- Zamanla değişen bilgileri sorma: güncel rekorlar, görevdeki kişiler, son turnuva sonuçları, nüfus sıralaması, "şu an".
- Yanlış şıklar makul olsun ve doğru cevapla aynı türden olsun (yıl için yıl, kişi için kişi). "Hepsi", "Hiçbiri", "A ve B" gibi şık yazma.
- Soru metni cevabı ele vermesin. Soru en fazla 140, her şık en fazla 40 karakter olsun, soru "?" ile bitsin.
- Zorluk karışık olsun: yaklaşık %25 kolay, %50 orta, %25 zor. Uygulamadaki hazır sorular çoğunlukla kolay ve bilinen konular,
  bu yüzden **orta ve zor sorulara, daha az bilinen ama kesin bilgilere** ağırlık ver.
- Akıcı, doğru yazımlı Türkçe kullan. Her yaştan oyuncuya uygun ol. Siyasi parti, din tartışması, aşırı şiddet, cinsellik yok.
- Kur'an ve din konularında soru yazma (uygulama ayetleri ayrıca gösteriyor).

## Alt konu örnekleri

- Tarih: Selçuklular, Osmanlı'nın kuruluş ve yükseliş dönemi, Osmanlı'nın son dönemi, Kurtuluş Savaşı, Cumhuriyet'in ilk yılları, Antik Yunan, Roma, Eski Mısır, Mezopotamya ve Anadolu uygarlıkları, Orta Çağ Avrupası, Büyük keşifler, Fransız Devrimi ve Napolyon, Birinci ve İkinci Dünya Savaşı, Soğuk Savaş, Çin ve Uzak Doğu, ünlü hükümdarlar ve komutanlar, Eski Türk devletleri
- Coğrafya: Türkiye'nin dağları, nehirleri, gölleri, ovaları, illeri ve bölgeleri; Avrupa, Asya, Afrika, Amerika; okyanuslar ve denizler; çöller, ormanlar, adalar; volkanlar, şelaleler; bayraklar ve sınırlar; iklim ve yer şekilleri; ünlü şehirler
- Bilim: gök bilimi ve uzay, fizik, kimya ve elementler, insan vücudu, genetik, icatlar ve teknoloji, matematik, ünlü bilim insanları, enerji ve elektrik, tıp tarihi, jeoloji, bilgisayar ve internetin tarihi
- Kültür ve Sanat: Türk ve dünya edebiyatı, resim ve ressamlar, klasik müzik, Türk halk ve sanat müziği, sinema tarihi, tiyatro, mimari ve ünlü yapılar, mitoloji ve efsaneler, el sanatları ve gelenekler, heykel, şairler, dünya mutfağı
- Spor: futbolun tarihi, Olimpiyatlar, basketbol, voleybol, tenis, atletizm, güreş ve dövüş sporları, kış sporları, satranç, spor kuralları ve ekipmanlar, tarihe geçmiş sporcular, motor sporları
- Doğa: memeliler, kuşlar, deniz canlıları, böcekler, sürüngenler ve kurbağalar, bitkiler ve ağaçlar, Türkiye'nin doğası, ekosistemler, nesli tehlike altındaki türler, hayvan davranışları ve göçler, dinozorlar ve fosiller, mantarlar ve mikroorganizmalar

## Hata durumunda

- Push reddedilirse (başka bir değişiklik araya girmiş olabilir): `git pull --rebase origin main` yapıp bir kez daha dene.
- `sorular.json` bozulursa dosyayı değiştirme, olanı bildir ve dur. Araç dosyayı yazmadan önce JSON'u doğrular.
