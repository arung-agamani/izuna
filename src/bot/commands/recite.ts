import { Command } from "@sapphire/framework";
import type { Message } from "discord.js";

export class ReciteCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: "recite",
            aliases: [],
            description: "gives a verse for your recital night, nyaa!",
        });
    }

    public async messageRun(message: Message) {
		var verse : string
        var verses : string[]
		const num = Math.floor(Math.random() * 2)
		switch (num) {
			case 0:
				verses = [
					"اَللهُ، بَعْدَ مَا كَلَّمَ الآبَاءَ بِالأَنْبِيَاءِ قَدِيماً، بِأَنْوَاعٍ وَطُرُقٍ كَثِيرَةٍ،1كَلَّمَنَا فِي هَذِهِ الأَيَّامِ الأَخِيرَةِ فِي ابْنِهِ - الَّذِي جَعَلَهُ وَارِثاً لِكُلِّ شَيْءٍ، الَّذِي بِهِ أَيْضاً عَمِلَ الْعَالَمِينَ.2الَّذِي، وَهُوَ بَهَاءُ مَجْدِهِ، وَرَسْمُ جَوْهَرِهِ، وَحَامِلٌ كُلَّ الأَشْيَاءِ بِكَلِمَةِ قُدْرَتِهِ، بَعْدَ مَا صَنَعَ بِنَفْسِهِ تَطْهِيراً لِخَطَايَانَا، جَلَسَ فِي يَمِينِ الْعَظَمَةِ فِي الأَعَالِي،3صَائِراً أَعْظَمَ مِنَ الْمَلاَئِكَةِ بِمِقْدَارِ مَا وَرِثَ اسْماً أَفْضَلَ مِنْهُمْ.4",
					"لأَنَّهُ لِمَنْ مِنَ الْمَلاَئِكَةِ قَالَ قَطُّ: «أَنْتَ ابْنِي أَنَا الْيَوْمَ وَلَدْتُكَ»؟ وَأَيْضاً: «أَنَا أَكُونُ لَهُ أَباً وَهُوَ يَكُونُ لِيَ ابْناً»؟5وَأَيْضاً مَتَى أَدْخَلَ الْبِكْرَ إِلَى الْعَالَمِ يَقُولُ: «وَلْتَسْجُدْ لَهُ كُلُّ مَلاَئِكَةِ اللهِ».6",
					"وَعَنِ الْمَلاَئِكَةِ يَقُولُ: «الصَّانِعُ مَلاَئِكَتَهُ رِيَاحاً وَخُدَّامَهُ لَهِيبَ نَارٍ».7وَأَمَّا عَنْ الاِبْنِ: «كُرْسِيُّكَ يَا أَللهُ إِلَى دَهْرِ الدُّهُورِ. قَضِيبُ اسْتِقَامَةٍ قَضِيبُ مُلْكِكَ.8أَحْبَبْتَ الْبِرَّ وَأَبْغَضْتَ الإِثْمَ. مِنْ أَجْلِ ذَلِكَ مَسَحَكَ اللهُ إِلَهُكَ بِزَيْتِ الاِبْتِهَاجِ أَكْثَرَ مِنْ شُرَكَائِكَ».9وَ«أَنْتَ يَا رَبُّ فِي الْبَدْءِ أَسَّسْتَ الأَرْضَ، وَالسَّمَاوَاتُ هِيَ عَمَلُ يَدَيْكَ.10هِيَ تَبِيدُ وَلَكِنْ أَنْتَ تَبْقَى، وَكُلُّهَا كَثَوْبٍ تَبْلَى،11وَكَرِدَاءٍ تَطْوِيهَا فَتَتَغَيَّرُ. وَلَكِنْ أَنْتَ أَنْتَ، وَسِنُوكَ لَنْ تَفْنَى».12",
					"ثُمَّ لِمَنْ مِنَ الْمَلاَئِكَةِ قَالَ قَطُّ: «اِجْلِسْ عَنْ يَمِينِي حَتَّى أَضَعَ أَعْدَاءَكَ مَوْطِئاً لِقَدَمَيْكَ؟»13أَلَيْسَ جَمِيعُهُمْ أَرْوَاحاً خَادِمَةً مُرْسَلَةً لِلْخِدْمَةِ لأَجْلِ الْعَتِيدِينَ أَنْ يَرِثُوا الْخَلاَصَ!14"
				];
				break;
			case 1:
				verses = [
				"لِذَلِكَ يَجِبُ أَنْ نَتَنَبَّهَ أَكْثَرَ إِلَى مَا سَمِعْنَا لِئَلاَّ نَفُوتَهُ،1لأَنَّهُ إِنْ كَانَتِ الْكَلِمَةُ الَّتِي تَكَلَّمَ بِهَا مَلاَئِكَةٌ قَدْ صَارَتْ ثَابِتَةً، وَكُلُّ تَعَدٍّ وَمَعْصِيَةٍ نَالَ مُجَازَاةً عَادِلَةً،2فَكَيْفَ نَنْجُو نَحْنُ إِنْ أَهْمَلْنَا خَلاَصاً هَذَا مِقْدَارُهُ، قَدِ ابْتَدَأَ الرَّبُّ بِالتَّكَلُّمِ بِهِ، ثُمَّ تَثَبَّتَ لَنَا مِنَ الَّذِينَ سَمِعُوا،3شَاهِداً اللهُ مَعَهُمْ بِآيَاتٍ وَعَجَائِبَ وَقُوَّاتٍ مُتَنَّوِعَةٍ وَمَوَاهِبِ الرُّوحِ الْقُدُسِ، حَسَبَ إِرَادَتِهِ؟4",
				"فَإِنَّهُ لِمَلاَئِكَةٍ لَمْ يُخْضِعِ «الْعَالَمَ الْعَتِيدَ» الَّذِي نَتَكَلَّمُ عَنْهُ.5لَكِنْ شَهِدَ وَاحِدٌ فِي مَوْضِعٍ قَائِلاً: «مَا هُوَ الإِنْسَانُ حَتَّى تَذْكُرَهُ، أَوِ ابْنُ الإِنْسَانِ حَتَّى تَفْتَقِدَهُ؟6وَضَعْتَهُ قَلِيلاً عَنِ الْمَلاَئِكَةِ. بِمَجْدٍ وَكَرَامَةٍ كَلَّلْتَهُ، وَأَقَمْتَهُ عَلَى أَعْمَالِ يَدَيْكَ.7أَخْضَعْتَ كُلَّ شَيْءٍ تَحْتَ قَدَمَيْهِ». لأَنَّهُ إِذْ أَخْضَعَ الْكُلَّ لَهُ لَمْ يَتْرُكْ شَيْئاً غَيْرَ خَاضِعٍ لَهُ - عَلَى أَنَّنَا الآنَ لَسْنَا نَرَى الْكُلَّ بَعْدُ مُخْضَعاً لَهُ -8",
				"وَلَكِنَّ الَّذِي وُضِعَ قَلِيلاً عَنِ الْمَلاَئِكَةِ، يَسُوعَ، نَرَاهُ مُكَلَّلاً بِالْمَجْدِ وَالْكَرَامَةِ، مِنْ أَجْلِ أَلَمِ الْمَوْتِ، لِكَيْ يَذُوقَ بِنِعْمَةِ اللهِ الْمَوْتَ لأَجْلِ كُلِّ وَاحِدٍ.9لأَنَّهُ لاَقَ بِذَاكَ الَّذِي مِنْ أَجْلِهِ الْكُلُّ وَبِهِ الْكُلُّ، وَهُوَ آتٍ بِأَبْنَاءٍ كَثِيرِينَ إِلَى الْمَجْدِ أَنْ يُكَمِّلَ رَئِيسَ خَلاَصِهِمْ بِالآلاَمِ.10",
				"لأَنَّ الْمُقَدِّسَ وَالْمُقَدَّسِينَ جَمِيعَهُمْ مِنْ وَاحِدٍ، فَلِهَذَا السَّبَبِ لاَ يَسْتَحِي أَنْ يَدْعُوَهُمْ إِخْوَةً،11قَائِلاً: «أُخَبِّرُ بِاسْمِكَ إِخْوَتِي، وَفِي وَسَطِ الْكَنِيسَةِ أُسَبِّحُكَ».12وَأَيْضاً: «أَنَا أَكُونُ مُتَوَكِّلاً عَلَيْهِ». وَأَيْضاً: «هَا أَنَا وَالأَوْلاَدُ الَّذِينَ أَعْطَانِيهِمِ اللهُ».13",
				"فَإِذْ قَدْ تَشَارَكَ الأَوْلاَدُ فِي اللَّحْمِ وَالدَّمِ اشْتَرَكَ هُوَ أَيْضاً كَذَلِكَ فِيهِمَا، لِكَيْ يُبِيدَ بِالْمَوْتِ ذَاكَ الَّذِي لَهُ سُلْطَانُ الْمَوْتِ، أَيْ إِبْلِيسَ،14وَيُعْتِقَ أُولَئِكَ الَّذِينَ خَوْفاً مِنَ الْمَوْتِ كَانُوا جَمِيعاً كُلَّ حَيَاتِهِمْ تَحْتَ الْعُبُودِيَّةِ.15لأَنَّهُ حَقّاً لَيْسَ يُمْسِكُ الْمَلاَئِكَةَ، بَلْ يُمْسِكُ نَسْلَ إِبْرَاهِيمَ.16",
				"مِنْ ثَمَّ كَانَ يَنْبَغِي أَنْ يُشْبِهَ إِخْوَتَهُ فِي كُلِّ شَيْءٍ، لِكَيْ يَكُونَ رَحِيماً، وَرَئِيسَ كَهَنَةٍ أَمِيناً فِي مَا لِلَّهِ حَتَّى يُكَفِّرَ خَطَايَا الشَّعْبِ.17لأَنَّهُ فِي مَا هُوَ قَدْ تَأَلَّمَ مُجَرَّباً يَقْدِرُ أَنْ يُعِينَ الْمُجَرَّبِينَ.18"
				];
				break;
			default:
				verses = [""]
				break;
		}
		verse = verses[Math.floor(Math.random() * verses.length)]
        await message.channel.send(
            `\`${verse} - \`**\`العبرانيين:${}\`**`
        );
    }
}
