/**
 * Vietnamese UI strings. Written in clear, natural Southern Vietnamese, the
 * variety spoken by the New Orleans metro's large Vietnamese community, in the
 * respectful "Quý khách" (valued customer) register that suits a counter
 * business. Full diacritics throughout; no em dashes.
 *
 * Typed as `UiDictionary`, so any key missing from this set is a compile error.
 * Louisiana-specific terms: "parish" keeps the English word with a "hạt" gloss,
 * "OMV" stays as the office's name, "tag/plate" -> "bảng số", "title" -> "giấy
 * chủ quyền xe".
 *
 * High-stakes strings (the $23 / OMV disclosure and money-decision fee copy)
 * live in lib/i18n/content/fees.ts and are flagged for native review before
 * launch. Given the community's size, the whole set deserves a native-speaker
 * pass.
 */
import type { UiDictionary } from "./en";

export const vi: UiDictionary = {
  language: {
    label: "Ngôn ngữ",
  },

  header: {
    navAria: "Chính",
    checkIn: "Lấy số",
    nav: {
      checklist: "Cần mang gì",
      services: "Dịch vụ",
      pricing: "Lệ phí",
      forms: "Biểu mẫu",
    },
  },

  footer: {
    getDirections: "Chỉ đường",
    hoursHeading: "Giờ làm việc",
    navAria: "Chân trang",
    navigateHeading: "Điều hướng",
    dealersHeading: "Đại lý",
    nav: {
      checklist: "Cần mang gì",
      pricing: "Lệ phí",
      services: "Dịch vụ",
      forms: "Biểu mẫu",
      checkIn: "Lấy số",
    },
    dealerLogin: "Đăng nhập đại lý",
    forDealers: "Dành cho đại lý",
    disclosureLabel: "Thông báo về phí bảng số công.",
    notOmv:
      "88 Title là đại lý cấp bảng số tư nhân và không phải là Văn phòng Quản lý Xe cơ giới Louisiana (OMV).",
    rights: (year, name) => `© ${year} ${name}. Bảo lưu mọi quyền.`,
  },

  home: {
    hero: {
      eyebrow: "Đại lý cấp bảng số khu vực New Orleans",
      headline: "Khỏi xếp hàng. Khỏi mất cả buổi chiều.",
      subhead:
        "Giấy chủ quyền xe, đăng ký và bảng số, hoàn tất ngay tại quầy chỉ trong một lần ghé. Lấy số trực tuyến trước khi đến.",
      cta: "Lấy số trực tuyến",
      slideshow: {
        regionLabel: "Dịch vụ của chúng tôi",
        cue: "Xem cần mang gì",
        viewService: (label: string) => `Xem ${label}`,
        serviceLink: (label: string) => `${label}, xem cần mang gì`,
      },
    },
    heroStatus: {
      checking: "Đang kiểm tra hàng đợi",
      noWait: "Hiện không phải chờ",
      waiting: (n: number) => `${n} người đang chờ`,
      open: (time: string) => `Đang mở cửa · đóng lúc ${time}`,
      opens: (day: string, time: string) => `Mở cửa ${day} lúc ${time}`,
      today: "hôm nay",
      tomorrow: "ngày mai",
    },
    services: {
      eyebrow: "Dịch vụ",
      heading: "Mọi thủ tục chúng tôi lo tại quầy",
      subhead: "Chọn một dịch vụ để bắt đầu.",
      walkIn: "Khỏi hẹn",
    },
  },

  queue: {
    emptyTitle: "Hiện không có ai xếp hàng",
    emptyBody: "Mời quý khách vào ngay. Quầy đang mở.",
    nowServing: "Đang phục vụ",
    inLine: "Đang chờ",
    waitingCount: (n) => `${n} người đang chờ`,
    noneWaiting: "Không có ai đang chờ.",
    you: "Quý khách",
    visitFallback: "Lượt làm thủ tục",
  },

  checkinStatus: {
    waiting: {
      label: "Đang chờ",
      description:
        "Quý khách đang trong hàng đợi. Chúng tôi sẽ gọi quý khách lên ngay khi quầy trống.",
    },
    in_progress: {
      label: "Đến lượt quý khách",
      description: "Mời quý khách đến quầy. Chúng tôi đã sẵn sàng phục vụ.",
    },
    no_show: {
      label: "Lỡ lượt gọi",
      description:
        "Chúng tôi đã gọi số của quý khách nhưng không thấy. Mời quý khách đến quầy và nhân viên sẽ hỗ trợ.",
    },
    complete: {
      label: "Hoàn tất",
      description: "Xong rồi. Cảm ơn quý khách đã đến 88 Title.",
    },
    cancelled: {
      label: "Đã hủy",
      description: "Lượt lấy số này đã được hủy.",
    },
  },

  servicesIndex: {
    eyebrow: "Dịch vụ",
    heading: "Chọn thủ tục của quý khách. Chúng tôi sẽ cho biết chính xác cần mang gì.",
    intro:
      "Mỗi dịch vụ mở ra danh sách riêng, để quý khách đến nơi với đúng giấy tờ ngay lần đầu.",
    whatToBring: "Cần mang gì",
    itemsToBring: (n) => `${n} món cần mang`,
    walkIn: "Khỏi hẹn",
  },

  forms: {
    eyebrow: "Biểu mẫu",
    heading: "Biểu mẫu OMV Louisiana",
    intro:
      "Các biểu mẫu trống của Văn phòng Quản lý Xe cơ giới (OMV) Louisiana, sẵn sàng để tải xuống.",
    download: "Tải xuống",
    pending: "Sắp có để tải xuống",
    downloadAria: (number, title) =>
      number ? `Tải xuống ${number}, ${title} (PDF)` : `Tải xuống ${title} (PDF)`,
  },

  dealers: {
    eyebrow: "Dành cho đại lý",
    headline: "Đừng cử người ra OMV xếp hàng nữa.",
    subhead:
      "Nộp hồ sơ giấy chủ quyền xe ngay tại bàn làm việc, theo dõi từng hồ sơ khi đang xử lý, và nhận lại khi hoàn tất. Một quầy duy nhất ở Metairie, dành cho khối lượng công việc của đại lý.",
    getSetUp: "Bắt đầu thiết lập",
    login: "Đăng nhập đại lý",
    pitchHeading: "Được thiết kế cho cách một đại lý vận hành",
    pitch: {
      fileTitle: "Nộp ngay tại bàn làm việc",
      fileBody:
        "Gửi hồ sơ trực tuyến trong vài phút. Không phải cử người đi, không xếp hàng, không mất cả buổi chiều ở OMV.",
      trackTitle: "Theo dõi tiến trình xử lý",
      trackBody:
        "Mỗi hồ sơ được theo dõi từ lúc tiếp nhận đến khi sẵn sàng để nhận, nên quý vị luôn biết hồ sơ của mình đang ở khâu nào.",
      readyTitle: "Biết ngay khi hồ sơ sẵn sàng",
      readyBody:
        "Cổng thông tin hiển thị “Sẵn sàng để nhận” ngay khi hoàn tất công việc, kèm thông báo qua email ngay khi chúng tôi bật tính năng này.",
      counterTitle: "Một quầy hiểu công việc của đại lý",
      counterBody:
        "Có giờ làm việc Thứ Bảy và vị trí ở Metairie, với nhân viên xử lý giấy chủ quyền xe suốt cả ngày.",
    },
    howHeading: "Cách thực hiện",
    step1Title: "Gọi hoặc gửi email cho chúng tôi",
    step1Body:
      "Cho chúng tôi biết về đại lý của quý vị và khối lượng giấy tờ quý vị xử lý. Chỉ một cuộc trao đổi ngắn.",
    step2Title: "Chúng tôi tạo tài khoản đăng nhập",
    step2Body:
      "Chúng tôi thiết lập tài khoản đại lý và gửi cho quý vị thông tin đăng nhập an toàn.",
    step3Title: "Nộp hồ sơ đầu tiên",
    step3Body:
      "Đăng nhập và gửi hồ sơ giấy chủ quyền xe ngay trong ngày, ngay tại bàn làm việc.",
    contactEyebrow: "Bắt đầu thiết lập",
    contactHeading: "Sẵn sàng thiết lập cho đại lý của quý vị?",
    contactBody:
      "Gọi điện hoặc gửi email và chúng tôi sẽ tạo tài khoản cho quý vị. Cách nhanh nhất để bắt đầu là một cuộc gọi ngắn.",
    callLabel: "Gọi",
    emailLabel: "Email",
    visitLabel: "Đến trực tiếp",
    hoursHeading: "Giờ làm việc",
    saturdayNote: "Mở cửa Thứ Bảy cho công việc của đại lý.",
  },

  serviceDetail: {
    backToAll: "← Tất cả dịch vụ",
    howItWorks: "Cách thực hiện",
    checklistHeading: (label) =>
      `Đây chính xác là những gì cần mang theo: ${label}`,
    whatToBring: "Cần mang gì",
    whatToBringIntro:
      "Bản tóm tắt. Hãy dùng công cụ danh sách để đánh dấu từng món khi quý khách chuẩn bị xong.",
    buildChecklist: "Lập danh sách giấy tờ cho thủ tục này",
    guidanceDisclaimer:
      "Đây là hướng dẫn chung giúp quý khách khỏi phải đi lại lần hai, không phải tư vấn pháp lý. Yêu cầu có thể thay đổi tùy trường hợp, và chúng tôi sẽ xác nhận chi tiết cho trường hợp của quý khách tại văn phòng.",
    commonQuestions: "Câu hỏi thường gặp",
    feesBefore: "Quý khách muốn biết chi phí? ",
    feesLink: "Cộng phí dịch vụ của 88 Title",
    feesAfter:
      ". Phí bảng số công $23 luôn được hiển thị thành một dòng riêng.",
    related: "Liên quan",
    checkIn: "Lấy số trực tuyến",
    closingLead: "Sẵn sàng chưa? Lấy số trực tuyến và khỏi phải xếp hàng.",
  },

  pricing: {
    eyebrow: "Phí dịch vụ",
    heading: "Cộng phí dịch vụ của quý khách",
    intro:
      "Chọn những dịch vụ quý khách cần và xem tạm tính phí dịch vụ của 88 Title cập nhật theo từng lựa chọn. Phí và thuế của tiểu bang thay đổi tùy theo xe và hạt (parish), nên những khoản đó được xử lý tại quầy chứ không ước tính ở đây.",
    tagFeeAria: "Phí bảng số công",
    tagFeeLine: "Phí bảng số công, luôn hiển thị thành một dòng riêng.",
    tagFeeAbout: "Về khoản $23:",
    calc: {
      addLegend: "Thêm những dịch vụ 88 Title mà quý khách cần",
      pickHint:
        "Chọn những món phù hợp. Tạm tính sẽ cập nhật theo từng lựa chọn.",
      summaryLabel: "Phí dịch vụ 88 Title",
      serviceFeesOnly: "Chỉ là phí dịch vụ, không phải tổng cuối cùng",
      noneSelected:
        "Chưa chọn dịch vụ nào. Hãy chọn những món quý khách cần và chúng sẽ được cộng ở đây.",
      alwaysIncluded: "(luôn bao gồm)",
      notFinalTitle: "Đây không phải tổng cuối cùng của quý khách",
      notFinalBody:
        "Phần này hiển thị phí dịch vụ của 88 Title. Phí và thuế của tiểu bang tùy thuộc vào xe và hạt (parish) cụ thể của quý khách và được tính tại quầy.",
      checkIn: "Lấy số trực tuyến",
    },
  },

  checklist: {
    eyebrow: "Danh sách giấy tờ",
    heading: "Cần mang gì",
    intro:
      "Cho chúng tôi biết quý khách cần làm gì và chúng tôi sẽ lập danh sách “cần mang gì” chính xác. Đánh dấu từng món khi quý khách chuẩn bị xong. Không cần tài khoản, và không lưu lại gì trừ khi quý khách chọn chia sẻ danh sách lúc lấy số.",
    finder: {
      step1Heading: "Đây là loại thủ tục gì?",
      step1Hint:
        "Chọn một loại và chúng tôi sẽ cho quý khách biết chính xác cần mang gì. Không cần tài khoản.",
      learnMore: "Tìm hiểu thêm về thủ tục này →",
      change: "Đổi",
      yourChecklist: "Danh sách của quý khách",
      ready: (done, total) => `${done} / ${total} đã sẵn sàng`,
      readyAria: (done, total) => `${done} trên ${total} món đã sẵn sàng`,
      completeTitle: "Quý khách đã sẵn sàng lấy số",
      completeBody: (label) =>
        `Quý khách đã chuẩn bị đầy đủ cho thủ tục: ${label}.`,
      progressHint:
        "Đánh dấu từng món khi quý khách chuẩn bị xong. Quý khách có thể lấy số bất cứ lúc nào, kể cả khi chưa chuẩn bị đủ mọi thứ.",
      shareTitle: "Đem danh sách này theo khi tôi lấy số",
      shareBody:
        "Chia sẻ thủ tục của quý khách và những món đã được đánh dấu sẵn sàng với quầy tiếp tân để họ chuẩn bị trước. Chỉ là loại giấy tờ, không bao giờ là bản thân giấy tờ. Không bắt buộc.",
      checkIn: "Lấy số trực tuyến",
      readyStamp: "Sẵn sàng",
      readyStampAria: "Sẵn sàng lấy số",
      downloadForm: "Tải biểu mẫu",
      downloadFormAria: (number, title) => `Tải xuống ${number}, ${title} (PDF)`,
    },
  },

  checkin: {
    eyebrow: "Lấy số",
    heading: "Lấy số trực tuyến",
    intro:
      "Giữ chỗ ngay trên điện thoại và theo dõi hàng đợi di chuyển theo thời gian thực. Chúng tôi sẽ báo cho quý khách ngay khi đến lượt, nên không phải đứng chờ.",
    formHeading: "Cho chúng tôi biết quý khách là ai",
    formHint: "Ba ô nhập nhanh là quý khách đã vào hàng đợi.",
    lineRightNow: "Hàng đợi hiện tại",
    lobbyView: "Màn hình phòng chờ",
    form: {
      serviceLabel: "Quý khách cần làm thủ tục gì?",
      servicePlaceholder: "Chọn thủ tục của quý khách…",
      sharingTitle: "Chia sẻ danh sách của quý khách với quầy tiếp tân",
      sharingAllReady: (total) =>
        `Quý khách đã đánh dấu cả ${total} món là sẵn sàng.`,
      sharingSomeReady: (ready, total) =>
        `Quý khách đã đánh dấu ${ready} trên ${total} món là sẵn sàng.`,
      sharingStillGathering: (labels) => ` Còn đang chuẩn bị: ${labels}.`,
      sharingHelp:
        "Giúp chúng tôi chuẩn bị cho lượt của quý khách. Chỉ là loại giấy tờ, không bao giờ là bản thân giấy tờ.",
      dontShare: "Không chia sẻ",
      nameLabel: "Tên của quý khách",
      namePlaceholder: "Nguyễn Văn An",
      emailLabel: "Email",
      emailPlaceholder: "quykhach@email.com",
      emailHint:
        "Chúng tôi sẽ gửi liên kết theo dõi trạng thái trực tiếp đến đây.",
      cellLabel: "Điện thoại di động",
      optional: "(không bắt buộc)",
      cellPlaceholder: "(504) 555-0123",
      renewalLabel: "Ngày hết hạn đăng ký",
      remindTitle: "Nhắc tôi trước khi đăng ký xe hết hạn",
      remindBody:
        "Chúng tôi sẽ gửi email nhắc nhở thân thiện khi đến hạn gia hạn. Mặc định tắt; có thể hủy đăng ký bất cứ lúc nào.",
      submitting: "Đang lấy số cho quý khách…",
      submit: "Lấy số",
      privacy: (isRenewal) =>
        `Không cần tài khoản. Chúng tôi chỉ dùng thông tin của quý khách cho lượt này${
          isRenewal ? " (và nhắc gia hạn, nếu quý khách chọn nhận)" : ""
        }.`,
      errors: {
        pickVisit: "Hãy chọn loại thủ tục quý khách cần làm.",
        addName: "Hãy nhập tên để chúng tôi có thể gọi quý khách.",
        validEmail:
          "Hãy nhập email hợp lệ. Đó là nơi nhận liên kết theo dõi trạng thái.",
        couldNotCheckIn: (message) =>
          `Không thể lấy số cho quý khách: ${message}`,
        tooManyCheckins:
          "Quý khách đã lấy số nhiều lần gần đây. Vui lòng đợi một lát rồi thử lại, hoặc gọi cho chúng tôi để được thêm vào hàng.",
      },
    },
  },

  status: {
    eyebrow: "Trạng thái trực tiếp",
    heading: "Lượt lấy số của quý khách",
    notFoundTitle: "Chúng tôi không tìm thấy lượt lấy số này",
    notFoundBody:
      "Liên kết có thể đã hết hạn hoặc đã hoàn tất. Quý khách có thể lấy số lại sau vài giây.",
    notFoundCta: "Lấy số",
    loading: "Đang tải trạng thái của quý khách…",
    upEyebrow: "Đến lượt quý khách",
    upHeadToCounter: "Mời đến quầy",
    upShowTicket: (code) => `Trình số ${code} cho nhân viên của chúng tôi.`,
    completeEyebrow: "Đã xong",
    completeTitle: "Cảm ơn quý khách đã đến 88 Title",
    completeBody: (code) => `Số ${code} đã hoàn tất. Lái xe cẩn thận nhé!`,
    cancelledTitle: "Đã hủy lấy số",
    cancelledBody:
      "Quý khách đổi ý? Có thể quay lại hàng đợi bất cứ lúc nào.",
    cancelledCta: "Lấy số lại",
    noShowTitle: (code) => `Chúng tôi đã gọi số ${code}`,
    noShowBody:
      "Có vẻ chúng tôi đã gọi nhưng không thấy quý khách. Mời quý khách đến quầy và nhân viên sẽ lo cho quý khách.",
    ticketFor: (service) => `Số của quý khách · ${service}`,
    youreNext: "Quý khách là người kế tiếp!",
    inLine: (position) => `#${position} trong hàng đợi`,
    peopleAhead: (ahead) =>
      `${ahead} người đang ở phía trước quý khách. Chúng tôi sẽ gọi quý khách lên ngay khi quầy trống.`,
    cancelling: "Đang hủy…",
    cancel: "Hủy chỗ của tôi",
    imHere: "Tôi đã đến",
    imHereHint: "Đang ở sảnh chờ? Hãy báo cho quầy biết quý khách đã đến.",
    imHereBusy: "Đang lưu…",
    arrivedNote: "Chúng tôi biết quý khách đã đến. Vui lòng chú ý số của quý khách.",
    lineRightNow: "Hàng đợi hiện tại",
    stampCheckedIn: "Đã lấy số",
    stampCheckedInAria: "Quý khách đã lấy số",
  },

  push: {
    onTitle: "🔔 Đã bật thông báo",
    onBody:
      "Chúng tôi sẽ báo đến thiết bị này ngay khi đến lượt quý khách, để quý khách có thể đóng trang.",
    reconfirm: "Xác nhận lại thiết bị này",
    reconfirming: "Đang xác nhận…",
    getNotifiedTitle: "Nhận thông báo khi đến lượt",
    iosBefore: "Trên iPhone, hãy nhấn ",
    iosAction: "Chia sẻ → Thêm vào Màn hình chính",
    iosAfter:
      ", rồi mở 88 Title từ đó để bật thông báo. Trong lúc đó chúng tôi sẽ gửi email cho quý khách và trang này vẫn cập nhật trực tiếp.",
    unsupportedBody:
      "Trình duyệt này không hiển thị được thông báo. Không sao: chúng tôi sẽ gửi email cho quý khách và giữ trang này cập nhật trực tiếp.",
    blockedTitle: "Thông báo đang bị chặn",
    blockedBody:
      "Không sao cả. Quý khách vẫn nhận được email và trang này cập nhật trực tiếp. Để bật thông báo, hãy cho phép thông báo cho trang web này trong cài đặt trình duyệt.",
    offerBody:
      "Bật thông báo và chúng tôi sẽ báo cho quý khách ngay cả khi quý khách đóng trang này hay cất điện thoại.",
    turnOn: "Bật thông báo",
    turningOn: "Đang bật…",
    error:
      "Không thể bật thông báo. Quý khách vẫn nhận được email và trang trực tiếp này.",
  },

  install: {
    dismiss: "Đóng",
    iosTap: "Nhấn",
    iosShare: "Chia sẻ",
    iosThen: ", rồi ",
    iosAdd: "Thêm vào Màn hình chính",
    statusTitle: "Thêm 88 Title vào màn hình chính của quý khách",
    statusBodyIos:
      "Cài đặt 88 Title và chúng tôi có thể báo cho quý khách ngay khi đến lượt, kể cả khi quý khách đóng trang này. Trên iPhone, việc cài đặt chính là cách bật thông báo.",
    statusBodyOther:
      "Để chúng tôi có thể báo cho quý khách ngay khi đến lượt, kể cả khi quý khách đóng trang này.",
    statusButton: "Thêm vào màn hình chính",
    opening: "Đang mở…",
    dealerTitle: "Cài đặt để truy cập nhanh và nhận thông báo",
    dealerBodyOther: "Một lần nhấn để thêm 88 Title vào màn hình chính.",
    install: "Cài đặt",
    homeBodyIosPrefix: "Thêm 88 Title vào màn hình chính. ",
    homeBodyOther:
      "Thêm 88 Title vào màn hình chính để truy cập nhanh và nhận thông báo.",
  },

  offlineBanner:
    "Quý khách đang ngoại tuyến. Cập nhật trực tiếp đang tạm dừng và sẽ tiếp tục ngay khi quý khách kết nối lại.",

  returning: {
    inLine: "Quý khách đang trong hàng đợi",
    ticketSuffix: (code) => `, số ${code}`,
    viewStatus: "Xem trạng thái trực tiếp của quý khách",
    visitFallback: "lượt của quý khách",
  },

  offlinePage: {
    eyebrow: "Quý khách đang ngoại tuyến",
    heading: "Cần có kết nối",
    body:
      "Hàng đợi trực tiếp và trạng thái lấy số của quý khách cập nhật theo thời gian thực, nên cần có internet. Hãy kết nối lại và quý khách sẽ tiếp tục đúng chỗ đã dừng.",
    tryAgain: "Thử lại",
    alreadyCheckedIn:
      "Quý khách đã lấy số rồi? Chúng tôi vẫn sẽ báo khi đến lượt.",
  },

  lobby: {
    heading: "Hàng đợi trực tiếp",
    updatesAuto: "Tự động cập nhật",
  },

  notFound: {
    eyebrow: "Không tìm thấy trang",
    title: "Lạc đường?",
    body: "Trang này đã rẽ nhầm hướng. Hãy lấy số tại quầy và chúng tôi sẽ chỉ đường đúng cho quý khách.",
    stamp: "404",
    home: "Về trang chủ",
    checkIn: "Lấy số trực tuyến",
  },

  meta: {
    home: {
      title: "88 Title | Đại lý cấp bảng số tại Metairie, LA",
      description:
        "Khỏi xếp hàng ở OMV. 88 Title lo chuyển nhượng giấy chủ quyền xe, bảng số, đăng ký và công chứng ngay tại quầy ở Metairie, Louisiana. Lấy số trực tuyến và mang theo đúng giấy tờ.",
    },
    services: {
      title: "Dịch vụ giấy chủ quyền xe và đăng ký tại Metairie, LA",
      description:
        "Mọi thủ tục 88 Title đảm nhận tại Metairie: chuyển nhượng giấy chủ quyền xe, đăng ký xe mới chuyển đến Louisiana, cấp lại giấy chủ quyền, xe thừa kế, gia hạn, bảng số và công chứng. Tìm hiểu cách thực hiện từng thủ tục.",
    },
    pricing: {
      title: "Phí dịch vụ tại Metairie, LA",
      description:
        "Cộng phí dịch vụ của 88 Title tại Metairie. Phí bảng số công $23 theo luật định và luôn hiển thị thành một dòng riêng. Chỉ gồm phí dịch vụ, không ước tính thuế và không có tổng tính riêng cho từng người.",
    },
    forms: {
      title: "Biểu mẫu OMV Louisiana | DPSMV 1799, Bill of Sale, 1806, 1606, 1966",
      description:
        "Tải các biểu mẫu trống của OMV Louisiana tại 88 Title ở Metairie: DPSMV 1799 (đơn xin cấp giấy chủ quyền và đăng ký xe), Bill of Sale (giấy mua bán), DPSMV 1806 (giấy cho phép xử lý thủ tục), DPSMV 1606 (bản khai số dặm) và DPSMV 1966 (giấy chứng nhận y khoa về suy giảm khả năng đi lại).",
    },
    dealers: {
      title: "Dịch vụ giấy chủ quyền xe cho đại lý tại Metairie | Xử lý title",
      description:
        "88 Title xử lý giấy chủ quyền xe cho đại lý tại Metairie, phục vụ khu vực New Orleans. Nộp hồ sơ trực tuyến, theo dõi từng hồ sơ đến khi sẵn sàng để nhận, và khỏi cử người ra OMV. Thiết lập tài khoản đại lý của quý vị.",
    },
    checklist: {
      title: "Cần mang gì tại Metairie, LA",
      description:
        "Lập danh sách giấy tờ chính xác cho thủ tục chuyển nhượng giấy chủ quyền xe, bảng số, đăng ký, xe thừa kế hay công chứng ở Louisiana, rồi lấy số tại 88 Title ở Metairie.",
    },
    checkin: {
      title: "Lấy số trực tuyến tại Metairie, LA",
      description:
        "Lấy số trực tuyến cho 88 Title tại Metairie. Giữ chỗ trong hàng đợi trực tiếp ngay trên điện thoại và chúng tôi sẽ báo cho quý khách ngay khi đến lượt.",
    },
    status: {
      title: "Lượt lấy số của quý khách",
      description: "Vị trí trực tiếp của quý khách trong hàng đợi lấy số của 88 Title.",
    },
    lobby: {
      title: "Phòng chờ · hàng đợi trực tiếp",
      description: "Màn hình hàng đợi phòng chờ của 88 Title.",
    },
    offline: {
      title: "Quý khách đang ngoại tuyến",
      description: "88 Title cần có kết nối để hiển thị hàng đợi trực tiếp.",
    },
    notFound: {
      title: "Không tìm thấy trang",
      description:
        "Không có trang đó ở đây. Hãy quay lại 88 Title ở Metairie hoặc lấy số trực tuyến.",
    },
    serviceNotFound: "Không tìm thấy dịch vụ",
    serviceFallbackTitle: (label) => `${label} tại Metairie, LA`,
    serviceFallbackDescription: (blurb, label) =>
      `${blurb} Xem chính xác cần mang gì cho ${label.toLowerCase()} tại 88 Title ở Metairie, rồi lấy số trực tuyến.`,
  },
};
