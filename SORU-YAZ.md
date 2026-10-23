# Sır Bende: yeni soru yazma görevi

Bu dosya, zamanlanmış Claude görevinin her çalışmada izleyeceği talimattır. Amaç: uygulamanın "Sınırsız" modu için
**her seferinde yaklaşık 40 yeni, doğru ve özgün soru** yazıp `sorular.json` dosyasına eklemek. Uygulama bu dosyayı
arka planda okuyup soru havuzuna katar.

## Yapılacaklar (sırayla)

1. Depo güncel olsun (`git pull`). Sonra durumu gör:
   - `node birlestir.mjs --say` → kategorilere göre kaç soru var. Az olan kategorilere ağırlık ver.
   - `node birlestir.mjs --son 150` → son eklenen soruların metni. Aynı bilgiyi yeniden sorma.
   - `node birlestir.mjs --mevcut` → uygulamanın içindeki hazır 180 soru ve cevapları. Bunların aynısını ya da aynı bilgiyi başka sözcüklerle sorma.
2. Yaklaşık 45 soru yaz ve `yeni.json` dosyasına koy (bu dosya depoya eklenmez, iş bitince silinir). Biçim:
   `[{"k":0,"q":"Soru metni?","o":["A şıkkı","B şıkkı","C şıkkı","D şıkkı"],"a":2}]`
   - `k` kategori no: 0 Tarih, 1 Coğrafya, 2 Bilim, 3 Kültür ve Sanat, 4 Spor, 5 Doğa, 6 Edebiyat, 7 Atasözleri ve Deyimler, 8 Peygamberler Tarihi
   - `a` doğru şıkkın sırası (0-3). Şıkları karıştırmakla uğraşma, araç eklerken karıştırır.
3. `node birlestir.mjs yeni.json` çalıştır. Araç kural dışı ve tekrar soruları `RED` satırlarıyla bildirir.
   Reddedilenleri düzelt ya da at. Eklenen sayısı 30'dan azsa yeni sorular yazıp tekrarla (en fazla 3 tur).
   **Birleştirmeden önce son kontrol:** `yeni.json` içindeki her soruyu tek tek yeniden oku. Doğru şıkkı ve soru metnindeki
   her iddiayı (sıfatlar, tarihler, yer adları dahil) ayrı ayrı doğrula. İkinci kez şüphe duyduğun soruyu at.
4. `git add sorular.json`, `git commit -m "Yeni sorular (N)"`, `git push origin main`.
   Başka hiçbir dosyayı değiştirme. `yeni.json` dosyasını sil.
5. Sonunda tek satır rapor ver: kaç soru eklendi, dosyada toplam kaç soru var.

## Kalite kuralları (çok önemli: yanlış bilgi uygulamayı bozar)

- Yalnızca **kesin ve doğrulanabilir** bilgileri sor. Emin olmadığın bir soruyu yazma. Şüphen varsa WebSearch ile
  doğrula ya da soruyu at. Az ama doğru soru, çok ama şüpheli sorudan iyidir.
- Soru metnindeki her ek bilgi de doğru olmalı: süsleyici sıfatlar ("pembe renkli göl" gibi) ve tanımlar yanlış olursa soru bozulur. Gerekmiyorsa ekleme.
- Uyruk, vatandaşlık, "ilk" ve "en" iddialarında kaynaklar ayrışıyorsa sorma (örn. doğduğu ülke ile vatandaşlığı farklı olan kişiler). Doğum yeri gibi kesin ölçüt kullan.
- Tek bir doğru cevap olsun. Tartışmalı, yoruma açık ya da "en iyi/en güzel" türü sorular yazma.
- Zamanla değişen bilgileri sorma: güncel rekorlar, görevdeki kişiler, son turnuva sonuçları, nüfus sıralaması, "şu an".
- Yanlış şıklar makul olsun ve doğru cevapla aynı türden olsun (yıl için yıl, kişi için kişi). "Hepsi", "Hiçbiri", "A ve B" gibi şık yazma.
- Soru metni cevabı ele vermesin. Soru en fazla 140, her şık en fazla 40 karakter olsun, soru "?" ile bitsin.
- Zorluk karışık olsun: yaklaşık %25 kolay, %50 orta, %25 zor. Uygulamadaki hazır sorular çoğunlukla kolay ve bilinen konular,
  bu yüzden **orta ve zor sorulara, daha az bilinen ama kesin bilgilere** ağırlık ver.
- Akıcı, doğru yazımlı Türkçe kullan. Her yaştan oyuncuya uygun ol. Siyasi parti, din tartışması, aşırı şiddet, cinsellik yok.
- Din konusunda yalnızca **8 Peygamberler Tarihi** kategorisinde soru yaz (aşağıdaki özel kurallarla). Başka kategorilerde din, mezhep ve ibadet sorusu yazma. Ayetlerin kendisini sorma, uygulama ayetleri ayrıca gösteriyor.
- **6 Edebiyat:** yazar-eser eşleştirmesi, edebiyat tarihi ve ünlü eserler. Eserin yazarı konusunda tartışma olanları sorma. Aynı eseri hem soru hem şıkta ele verme.
- **7 Atasözleri ve Deyimler:** yalnızca TDK sözlüklerindeki yaygın, tek bir biçimi olan atasözü ve deyimleri sor. Tamamlama sorularında yanlış şıklar anlamlı ama kalıba uymayan sözler olsun, birden fazla şık kalıba uyabiliyorsa soruyu at. Deyim anlamını TDK ile örtüşen biçimde yaz.
- **8 Peygamberler Tarihi:** yalnızca Kur'an'da adı geçen peygamberler, kıssaları ve İslam kaynaklarında ittifakla bilinen temel bilgiler (kim, hangi kavme/olaya/kitaba bağlı, hangi şehir). Mezhepler arasında farklı anlatılan, zayıf ya da kaynağı belirsiz rivayetleri (israiliyat), fıkıh ve ibadet ayrıntılarını, tarih ve sayı bilgisini, kıyaslama ve yorum gerektirenleri sorma. Peygamber adlarında "Hz." unvanı kullan ve saygılı bir dil tut. Soru "Kur'an'a göre" ya da "İslam inancına göre" diye çerçevelensin, tek bir doğru cevap olsun.

## Alt konu örnekleri

- Tarih: Selçuklular, Osmanlı'nın kuruluş ve yükseliş dönemi, Osmanlı'nın son dönemi, Kurtuluş Savaşı, Cumhuriyet'in ilk yılları, Antik Yunan, Roma, Eski Mısır, Mezopotamya ve Anadolu uygarlıkları, Orta Çağ Avrupası, Büyük keşifler, Fransız Devrimi ve Napolyon, Birinci ve İkinci Dünya Savaşı, Soğuk Savaş, Çin ve Uzak Doğu, ünlü hükümdarlar ve komutanlar, Eski Türk devletleri
- Coğrafya: Türkiye'nin dağları, nehirleri, gölleri, ovaları, illeri ve bölgeleri; Avrupa, Asya, Afrika, Amerika; okyanuslar ve denizler; çöller, ormanlar, adalar; volkanlar, şelaleler; bayraklar ve sınırlar; iklim ve yer şekilleri; ünlü şehirler
- Bilim: gök bilimi ve uzay, fizik, kimya ve elementler, insan vücudu, genetik, icatlar ve teknoloji, matematik, ünlü bilim insanları, enerji ve elektrik, tıp tarihi, jeoloji, bilgisayar ve internetin tarihi
- Kültür ve Sanat: resim ve ressamlar, klasik müzik, Türk halk ve sanat müziği, sinema tarihi ve ünlü filmler, tiyatro, mimari ve ünlü yapılar, mitoloji ve efsaneler, el sanatları ve gelenekler, heykel, dans ve opera, dünya mutfağı (edebiyat artık ayrı kategori)
- Spor: futbolun tarihi, Olimpiyatlar, basketbol, voleybol, tenis, atletizm, güreş ve dövüş sporları, kış sporları, satranç, spor kuralları ve ekipmanlar, tarihe geçmiş sporcular, motor sporları
- Doğa: memeliler, kuşlar, deniz canlıları, böcekler, sürüngenler ve kurbağalar, bitkiler ve ağaçlar, Türkiye'nin doğası, ekosistemler, nesli tehlike altındaki türler, hayvan davranışları ve göçler, dinozorlar ve fosiller, mantarlar ve mikroorganizmalar
- Edebiyat: Türk romanı ve ünlü romancılar, Türk şiiri ve şairler, dünya romanı klasikleri, divan ve halk edebiyatı, destanlar ve Dede Korkut, Nobel Edebiyat Ödülü, tiyatro ve oyun yazarları, hikâye ve öykü yazarları, çocuk edebiyatı klasikleri, edebiyat akımları, mesnevi ve tasavvuf edebiyatı
- Atasözleri ve Deyimler: atasözlerini tamamlama, deyimlerin anlamları, yiyecek ve içecekle, hayvanlarla, vücut bölümleriyle, doğa ve hava ile ilgili atasözleri ve deyimler, zaman ve para, dostluk ve komşuluk, çalışma ve emek, söz kalıpları
- Peygamberler Tarihi: Hz. Âdem ve Hz. Nuh, Hz. İbrahim ve ailesi, Hz. Yusuf, Hz. Musa ve Firavun, Hz. Davud ve Hz. Süleyman, Hz. İsa ve Hz. Meryem, Hz. Muhammed'in hayatı (doğum, vahiy, hicret), peygamberlere verilen kitaplar, mucizeler, Kur'an kıssaları

## Hata durumunda

- Push reddedilirse (başka bir değişiklik araya girmiş olabilir): `git pull --rebase origin main` yapıp bir kez daha dene.
- `sorular.json` bozulursa dosyayı değiştirme, olanı bildir ve dur. Araç dosyayı yazmadan önce JSON'u doğrular.
