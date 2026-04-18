/* ═══════════════════════════════════════════════
   MITV PLAYER — CHANNEL DATA
   By: Muaaz Iqbal | Muslim Islam Project
═══════════════════════════════════════════════ */

const MITV_DATA = {
  categories: [
    {
      id: 'livetv',
      label: 'Live TV',
      icon: 'fa-tv',
      channels: [
        {
          id: 'lt1',
          name: 'ARY News',
          category: 'Live TV',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/ARY_News_logo.svg/200px-ARY_News_logo.svg.png',
          thumbnail: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=220&fit=crop',
          stream: 'https://ary-news.v3.geo.tv/ARY-NEWS/smil:ARY-NEWS.smil/playlist.m3u8',
          isLive: true,
        },
        {
          id: 'lt2',
          name: 'Geo News',
          category: 'Live TV',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Geo_News_logo.svg/200px-Geo_News_logo.svg.png',
          thumbnail: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=220&fit=crop',
          stream: 'https://geo-news.geosuper.tv/GEO-NEWS/smil:GEO-NEWS.smil/playlist.m3u8',
          isLive: true,
        },
        {
          id: 'lt3',
          name: 'Express News',
          category: 'Live TV',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3c/Express_News_logo.png/200px-Express_News_logo.png',
          thumbnail: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=220&fit=crop',
          stream: 'https://stream.expressgroup.com.pk:1935/live/express24/playlist.m3u8',
          isLive: true,
        },
        {
          id: 'lt4',
          name: 'Samaa TV',
          category: 'Live TV',
          quality: 'FHD',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4a/Samaa_TV_Logo.png/200px-Samaa_TV_Logo.png',
          thumbnail: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=220&fit=crop',
          stream: 'https://cdn2.samaa.tv:8443/samaa/smil:samaa.smil/playlist.m3u8',
          isLive: true,
        },
        {
          id: 'lt5',
          name: 'BOL News',
          category: 'Live TV',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/BOL_Network_Logo.png/200px-BOL_Network_Logo.png',
          thumbnail: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=220&fit=crop',
          stream: 'https://vidstreaming.bolnews.com/live/bolnews/index.m3u8',
          isLive: true,
        },
        {
          id: 'lt6',
          name: 'Capital TV',
          category: 'Live TV',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/35/Capital_TV_Logo.png/200px-Capital_TV_Logo.png',
          thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=220&fit=crop',
          stream: 'https://capitaltv.live/hls/live.m3u8',
          isLive: true,
        },
      ]
    },
    {
      id: 'news',
      label: 'World News',
      icon: 'fa-globe',
      channels: [
        {
          id: 'n1',
          name: 'Al Jazeera',
          category: 'News',
          quality: 'FHD',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Al_Jazeera_English_logo.svg/200px-Al_Jazeera_English_logo.svg.png',
          thumbnail: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=400&h=220&fit=crop',
          stream: 'https://live-hls-web-aje.getaj.net/AJE/01.m3u8',
          isLive: true,
        },
        {
          id: 'n2',
          name: 'BBC World',
          category: 'News',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/BBC_iPlayer_logo.svg/200px-BBC_iPlayer_logo.svg.png',
          thumbnail: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=220&fit=crop',
          stream: 'https://vs-hls-pushb-uk.live.fastly.net/pool_904/live/pool_904/bbc_one_hd/bbc_one_hd.isml/.m3u8',
          isLive: true,
        },
        {
          id: 'n3',
          name: 'Sky News',
          category: 'News',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/aa/Sky_News_logo_2020.svg/200px-Sky_News_logo_2020.svg.png',
          thumbnail: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=400&h=220&fit=crop',
          stream: 'https://skynews-plutotv-live.akamaized.net/master/manifest.m3u8',
          isLive: true,
        },
        {
          id: 'n4',
          name: 'France 24',
          category: 'News',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/France_24_logo.svg/200px-France_24_logo.svg.png',
          thumbnail: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=400&h=220&fit=crop',
          stream: 'https://f24hls-i.akamaihd.net/hls/live/221147/F24_EN_HI_HLS/master.m3u8',
          isLive: true,
        },
        {
          id: 'n5',
          name: 'DW News',
          category: 'News',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Deutsche_Welle_symbol_2012.svg/200px-Deutsche_Welle_symbol_2012.svg.png',
          thumbnail: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=220&fit=crop',
          stream: 'https://dwamdstream102.akamaized.net/hls/live/2015530/dwstream102/index.m3u8',
          isLive: true,
        },
      ]
    },
    {
      id: 'islamic',
      label: 'Islamic Channels',
      icon: 'fa-mosque',
      channels: [
        {
          id: 'is1',
          name: 'Mecca Live',
          category: 'Islamic',
          quality: 'FHD',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Saudi_TV1.svg/200px-Saudi_TV1.svg.png',
          thumbnail: 'https://images.unsplash.com/photo-1537542696990-53de72bf5ddc?w=400&h=220&fit=crop',
          stream: 'https://dreamer.saudibroadcasting.net/live/live.isml/live.m3u8',
          isLive: true,
        },
        {
          id: 'is2',
          name: 'Quran Radio',
          category: 'Islamic',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Quran.png/200px-Quran.png',
          thumbnail: 'https://images.unsplash.com/photo-1588776814546-1ffbb25f13af?w=400&h=220&fit=crop',
          stream: 'https://Qurango.net/radio/tarateel',
          isLive: true,
        },
        {
          id: 'is3',
          name: 'Peace TV',
          category: 'Islamic',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5d/Peace_TV_English.png/200px-Peace_TV_English.png',
          thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=220&fit=crop',
          stream: 'https://peacetv.e2enetworks.net/peacetv/index.m3u8',
          isLive: true,
        },
        {
          id: 'is4',
          name: 'Huda TV',
          category: 'Islamic',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Huda_TV.png/200px-Huda_TV.png',
          thumbnail: 'https://images.unsplash.com/photo-1614878342248-fa7f97f4e9ae?w=400&h=220&fit=crop',
          stream: 'https://edge1.huda.tv:1936/live/livestream/playlist.m3u8',
          isLive: true,
        },
        {
          id: 'is5',
          name: 'Islam Channel',
          category: 'Islamic',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c0/Islam_Channel_logo.png/200px-Islam_Channel_logo.png',
          thumbnail: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=400&h=220&fit=crop',
          stream: 'https://islamchannel.tv/live/stream/livestream.m3u8',
          isLive: true,
        },
        {
          id: 'is6',
          name: 'Iqraa TV',
          category: 'Islamic',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/6e/Iqraa_TV.png/200px-Iqraa_TV.png',
          thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=220&fit=crop',
          stream: 'https://iqraa.akamaized.net/hls/live/2001349/iqraa/index.m3u8',
          isLive: true,
        },
      ]
    },
    {
      id: 'movies',
      label: 'Movies & Entertainment',
      icon: 'fa-film',
      channels: [
        {
          id: 'mv1',
          name: 'Cineplex',
          category: 'Movies',
          quality: 'FHD',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/35/Cineplex_Digital_Networks_2023.png/200px-Cineplex_Digital_Networks_2023.png',
          thumbnail: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=220&fit=crop',
          stream: 'https://cdn.cineplex.com/streams/live/movie1.m3u8',
          isLive: false,
        },
        {
          id: 'mv2',
          name: 'Filmazia',
          category: 'Movies',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e2/Filmazia_channel_logo.jpg/200px-Filmazia_channel_logo.jpg',
          thumbnail: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&h=220&fit=crop',
          stream: 'https://filmazia.pakorn.tv/live/filmazia.m3u8',
          isLive: true,
        },
        {
          id: 'mv3',
          name: 'Urdu 1',
          category: 'Movies',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0b/Urdu1.png/200px-Urdu1.png',
          thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=220&fit=crop',
          stream: 'https://urdu1.live/hls/urdu1.m3u8',
          isLive: true,
        },
        {
          id: 'mv4',
          name: 'Hum TV',
          category: 'Movies',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/HUM_TV_logo.svg/200px-HUM_TV_logo.svg.png',
          thumbnail: 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=400&h=220&fit=crop',
          stream: 'https://hum-live.akamaized.net/hum-live/smil:hum-live.smil/playlist.m3u8',
          isLive: true,
        },
        {
          id: 'mv5',
          name: 'ARY Digital',
          category: 'Movies',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/ARY_Digital_logo.svg/200px-ARY_Digital_logo.svg.png',
          thumbnail: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400&h=220&fit=crop',
          stream: 'https://ary-digital.v3.geo.tv/ARY-DIGITAL/smil:ARY-DIGITAL.smil/playlist.m3u8',
          isLive: true,
        },
      ]
    },
    {
      id: 'music',
      label: 'Music',
      icon: 'fa-music',
      channels: [
        {
          id: 'mu1',
          name: 'MTV Beats',
          category: 'Music',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/MTV_Beats.png/200px-MTV_Beats.png',
          thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=220&fit=crop',
          stream: 'https://mtv-beats-live.akamaized.net/hls/live/index.m3u8',
          isLive: true,
        },
        {
          id: 'mu2',
          name: 'B4U Music',
          category: 'Music',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/ff/B4U_music.png/200px-B4U_music.png',
          thumbnail: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&h=220&fit=crop',
          stream: 'https://b4u-music.live/hls/index.m3u8',
          isLive: true,
        },
        {
          id: 'mu3',
          name: 'Viacom 18',
          category: 'Music',
          quality: 'HD',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/1/1e/Viacom18_logo.svg/200px-Viacom18_logo.svg.png',
          thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=220&fit=crop',
          stream: 'https://viacom18.live/hls/index.m3u8',
          isLive: true,
        },
        {
          id: 'mu4',
          name: 'Coke Studio',
          category: 'Music',
          quality: 'FHD',
          logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/c/c3/Coke_Studio_Pakistan.png/200px-Coke_Studio_Pakistan.png',
          thumbnail: 'https://images.unsplash.com/photo-1445985543470-41fba5c3144a?w=400&h=220&fit=crop',
          stream: 'https://cokestudio.live/hls/index.m3u8',
          isLive: false,
        },
      ]
    },
    {
      id: 'favorites',
      label: 'My Favourites',
      icon: 'fa-star',
      channels: [] // Populated dynamically
    }
  ],

  heroChannels: ['lt1', 'n1', 'is1', 'mv4'],

  getFeaturedChannel() {
    const allChannels = this.getAllChannels();
    const ids = this.heroChannels;
    const id = ids[Math.floor(Math.random() * ids.length)];
    return allChannels.find(c => c.id === id) || allChannels[0];
  },

  getAllChannels() {
    return this.categories.flatMap(cat => cat.channels);
  },

  findChannel(id) {
    return this.getAllChannels().find(c => c.id === id);
  },

  search(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return this.getAllChannels().filter(c =>
      c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    ).slice(0, 8);
  }
};
