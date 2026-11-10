const laborLawSource = "4857 sayılı İş Kanunu: https://www.mevzuat.gov.tr/mevzuatmetin/1.5.4857.pdf";
const severanceLawSource = "1475 sayılı İş Kanunu'nun yürürlükteki 14. maddesi: https://www.mevzuat.gov.tr/mevzuatmetin/1.5.1475.pdf";

function normalizeQuestion(question) {
  return question
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
}

export function getLocalLegalAnswer(question) {
  const text = normalizeQuestion(question);
  const disclaimer = "\n\nBu ücretsiz yerel rehber, anahtar sözcüklere göre hazırlanmış genel bilgidir; yapay zekâ değildir ve somut olayınızı değerlendiremez. Mevzuatın güncel metnini kontrol edin; süre veya hak kaybı riski varsa avukata danışın.";
  const durationMatch = text.match(/(\d+(?:[,.]\d+)?)\s*ay\s*(?:boyunca|calis\w*|kidem)?/);
  const durationMonths = durationMatch ? Number(durationMatch[1].replace(",", ".")) : null;

  if (/kidem|tazminat/.test(text)) {
    if (durationMonths !== null && durationMonths < 12) {
      let answer = `Belirttiğiniz yaklaşık ${durationMonths} aylık çalışma, genel kıdem tazminatı için aranan aynı işverene bağlı en az bir yıllık çalışma koşulunu karşılamaz. Kanundaki bazı özel sona erme halleri ayrıca değerlendirilmelidir. Net maaş üzerinden kesin tazminat hesabı yapılamaz.\n\nKaynak: ${severanceLawSource}`;
      if (/ihbar|bildirim|kac hafta/.test(text)) {
        const noticeWeeks = durationMonths > 6 ? 4 : 2;
        answer += `\n\nBelirsiz süreli sözleşmede ihbar süresi bakımından, bu kıdem aralığında asgari süre genel olarak ${noticeWeeks} haftadır. İşverenin bildirim süresine uymadan feshi halinde ihbar tazminatı gündeme gelebilir; fesih türü ve olayın koşulları önemlidir.`;
      }
      return answer + disclaimer;
    }

    let answer = "Kıdem tazminatı her işten ayrılma halinde otomatik olarak doğmaz. Genel olarak aynı işverene bağlı en az bir yıllık çalışma ve kanunda sayılan sona erme koşullarından birinin gerçekleşmesi gerekir. Tutar hesabında son giydirilmiş brüt ücret ve kıdem tavanı önemlidir; net maaş tek başına yeterli değildir. Bu yüzden yalnızca net ücret ve çalışma süresiyle kesin tutar söylemek doğru olmaz.\n\nKaynak: " + severanceLawSource;
    if (/ihbar|bildirim|notice/.test(text)) {
      answer += "\n\nİhbar süresi kıdem tazminatından ayrıdır. 4857 sayılı Kanun'un 17. maddesinde, üç yıldan uzun çalışmada asgari bildirim süresi 8 hafta olarak düzenlenmiştir; uygulanabilirlik fesih sebebine ve olayın ayrıntılarına bağlıdır.";
    }
    return answer + disclaimer;
  }

  if (/ihbar|bildirim suresi|fesih suresi/.test(text)) {
    return "Belirsiz süreli iş sözleşmelerinde 4857 sayılı İş Kanunu'nun 17. maddesi asgari bildirim sürelerini düzenler: 6 aydan az kıdemde 2 hafta, 6 ay–1,5 yıl arası 4 hafta, 1,5–3 yıl arası 6 hafta, 3 yıldan fazla kıdemde 8 hafta. Bu süreler asgari olup fesih türü ve somut koşullar sonucu etkileyebilir.\n\nKaynak: " + laborLawSource + disclaimer;
  }

  if (/fazla mesai|fazla calisma|fazla saat|hafta tatili|fazla calis/.test(text)) {
    return "Genel kural olarak haftalık normal çalışma süresi en çok 45 saattir. 45 saati aşan çalışmalar fazla çalışma sayılır ve her bir saat için normal saat ücretinin yüzde 50 artırılmasıyla ödeme yapılır. Sözleşmeyle haftalık süre 45 saatin altındaysa, bu süre ile 45 saat arasındaki çalışma farklı kurala (yüzde 25 zamlı ücret) tabidir. Hafta tatili ve resmi tatil çalışmasının hesabı ayrıca değerlendirilir; çalışma kayıtları ve ücret bordrosu önemlidir.\n\nKaynak: 4857 sayılı Kanun'un 41. ve 46. maddeleri: " + laborLawSource + disclaimer;
  }

  if (/yillik izin|yillik ucretli izin|izin hak|yillik izin/.test(text)) {
    return "Yıllık ücretli izne hak kazanmak için, deneme süresi dahil işyerinde en az bir yıl çalışmış olmak gerekir. Kanundaki asgari süreler kıdeme göre 14, 20 veya 26 gündür; 18 yaş ve altındakiler ile 50 yaş ve üzerindekiler için asgari süre 20 günden az olamaz. İş sözleşmesi veya toplu iş sözleşmesi daha fazla izin tanıyabilir.\n\nKaynak: 4857 sayılı Kanun'un 53. maddesi: " + laborLawSource + disclaimer;
  }

  if (/is\s*ten cik|isten cik|fesih|kovul|is akdi|is sozlesmesi sona/.test(text)) {
    return "İş sözleşmesinin sona ermesinde fesih bildiriminin yazılı yapılması ve sebebin açıkça belirtilmesi gereken durumlar vardır. İş güvencesi hükümlerinin uygulanması; işyerindeki çalışan sayısı, kıdem, sözleşmenin türü ve fesih nedenine bağlıdır. İşe iade için başvuru süreleri kısa olabileceğinden fesih bildiriminin tarihini not edin ve gecikmeden bir iş hukuku avukatına danışın.\n\nKaynak: 4857 sayılı Kanun'un 17–21. maddeleri: " + laborLawSource + disclaimer;
  }

  if (/maas|ucret|odenme|odeme|eksik yatti|asgari ucret/.test(text)) {
    return "Ücretin miktarı, ödeme dönemi ve bordro kayıtları birlikte incelenmelidir. Ücretin ödenmemesi veya eksik ödenmesi halinde yazılı kayıtları, bordroları ve banka hareketlerini saklayın. İş sözleşmesini sona erdirme veya çalışmayı bırakma kararı doğurabilecek durumlarda, hak kaybı riskine karşı önce avukattan somut hukuki değerlendirme alın.\n\nKaynak: 4857 sayılı Kanun'un ücret ve ücretin ödenmesine ilişkin hükümleri: " + laborLawSource + disclaimer;
  }

  return "Ücretsiz yerel rehber şu an yalnızca kıdem/ihbar tazminatı, ihbar süresi, fazla mesai, yıllık izin, işten çıkarma/fesih ve ücret konularında temel bilgi sunabiliyor. Sorunuzu bu başlıklardan biriyle ilgili olacak şekilde yeniden yazın. Bu araç yapay zekâ değildir ve somut hukuki danışmanlık vermez.";
}
