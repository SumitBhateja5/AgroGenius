$(function () {
  var synth = window.speechSynthesis;
  var msg = new SpeechSynthesisUtterance();
  var voices = synth.getVoices();
  msg.voice = voices[0];
  msg.rate = 1;
  msg.pitch = 1;

  var selectedImage = null;

  function appendMessage(message, isUser, imageUrl = null) {
    var messageClass = isUser ? "user-message" : "bot-message";
    var logoHTML = isUser
      ? ""
      : '<div class="bot-logo"><img src="../static/robo.png" alt="AgriGenius Logo"></div>';
    var userImageHTML = isUser
      ? '<div class="user-image"><img src="../static/user.png" alt="User"></div>'
      : "";

    var imageHTML = "";
    if (imageUrl && isUser) {
      imageHTML =
        '<div class="message-image"><img src="' +
        imageUrl +
        '" alt="Uploaded image"></div>';
    }

    var messageElement = $(
      '<div class="message-container ' +
        (isUser ? "user-container" : "bot-container") +
        '">' +
        logoHTML +
        '<div class="message ' +
        messageClass +
        '">' +
        imageHTML +
        "</div>" +
        userImageHTML +
        "</div>"
    );
    $(".chat-messages").append(messageElement);

    if (isUser) {
      if (message) {
        messageElement
          .find(".message")
          .append('<div class="message-text">' + message + "</div>");
      }
    } else {
      var textDiv = $('<div class="message-text"></div>');
      messageElement.find(".message").append(textDiv);
      typeMessage(message, textDiv);
    }

    $(".chat-messages").scrollTop($(".chat-messages")[0].scrollHeight);
  }

  function typeMessage(message, element, speed = 15) {
    let i = 0;
    element.html("");
    const typingInterval = setInterval(() => {
      if (i < message.length) {
        element.html(element.html() + message.charAt(i));
        i++;
      } else {
        clearInterval(typingInterval);
      }
      $(".chat-messages").scrollTop($(".chat-messages")[0].scrollHeight);
    }, speed);
  }

  function showTypingIndicator() {
    var typingIndicator = $(
      '<div class="typing-indicator bot-message"><span></span><span></span><span></span></div>'
    );
    $(".chat-messages").append(typingIndicator);
    $(".chat-messages").scrollTop($(".chat-messages")[0].scrollHeight);
  }

  function removeTypingIndicator() {
    $(".typing-indicator").remove();
  }

  // Image upload button click
  $("#chatbot-form-btn-image").click(function (e) {
    e.preventDefault();
    $("#imageInput").click();
  });

  // Handle image selection
  $("#imageInput").change(function (e) {
    var file = e.target.files[0];
    if (file) {
      selectedImage = file;
      var reader = new FileReader();
      reader.onload = function (e) {
        $("#imagePreview").attr("src", e.target.result);
        $("#imagePreviewContainer").show();
      };
      reader.readAsDataURL(file);
    }
  });

  // Remove selected image
  $("#removeImage").click(function (e) {
    e.preventDefault();
    selectedImage = null;
    $("#imageInput").val("");
    $("#imagePreviewContainer").hide();
    $("#imagePreview").attr("src", "");
  });

  $("#chatbot-form-btn").click(function (e) {
    e.preventDefault();
    sendMessage();
  });

  $("#messageText").keypress(function (e) {
    if (e.which == 13) {
      e.preventDefault();
      sendMessage();
    }
  });

  var isProcessing = false;

  function disableInput() {
    $("#messageText").prop("disabled", true);
    $("#chatbot-form-btn").prop("disabled", true);
    $("#chatbot-form-btn-voice").prop("disabled", true);
    $("#chatbot-form-btn-image").prop("disabled", true);
  }

  function enableInput() {
    $("#messageText").prop("disabled", false);
    $("#chatbot-form-btn").prop("disabled", false);
    $("#chatbot-form-btn-voice").prop("disabled", false);
    $("#chatbot-form-btn-image").prop("disabled", false);
  }

  function sendMessage() {
    var message = $("#messageText").val().trim();
    var imageUrl = selectedImage ? $("#imagePreview").attr("src") : null;

    if ((message || selectedImage) && !isProcessing) {
      isProcessing = true;
      disableInput();

      appendMessage(message, true, imageUrl);
      $("#messageText").val("");
      showTypingIndicator();

      var formData = new FormData();
      formData.append("messageText", message);
      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      $.ajax({
        type: "POST",
        url: "/ask",
        data: formData,
        processData: false,
        contentType: false,
        success: function (response) {
          removeTypingIndicator();
          if (response.error) {
            appendMessage("Error: " + response.error, false);
          } else {
            var answer = response.answer;
            appendMessage(answer, false);

            if ($("#voiceReadingCheckbox").is(":checked")) {
              msg.text = answer;
              synth.speak(msg);
            }
          }
          isProcessing = false;
          enableInput();

          // Clear image after sending
          selectedImage = null;
          $("#imageInput").val("");
          $("#imagePreviewContainer").hide();
          $("#imagePreview").attr("src", "");
        },
        error: function (jqXHR, textStatus, errorThrown) {
          removeTypingIndicator();
          console.log(errorThrown);
          appendMessage(
            "Sorry, there was an error processing your request. Please try again later.",
            false
          );
          isProcessing = false;
          enableInput();
        },
      });
    }
  }

  var welcomeMessage =
    "🌱🌾 Welcome to AgriGenius !! 🌾🌱 Hi there! I'm AgriGenius, your virtual assistant for Agriculture. You can ask me questions or upload images of crops, plants, or soil for analysis. How can I assist you today?";

  $("#chatbot-form-btn-clear").click(function (e) {
    e.preventDefault();
    $(".chat-messages").empty();
    appendMessage(welcomeMessage, false);
  });

  $("#chatbot-form-btn-voice").click(function (e) {
    e.preventDefault();

    if ("webkitSpeechRecognition" in window && !isProcessing) {
      var recognition = new webkitSpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.start();

      recognition.onresult = function (event) {
        var speechResult = event.results[0][0].transcript;
        $("#messageText").val(speechResult);
        sendMessage();
      };

      recognition.onerror = function (event) {
        console.error("Speech recognition error:", event.error);
      };
    } else {
      console.log(
        "Web Speech API is not supported in this browser or processing is in progress"
      );
    }
  });

  $("#voiceReadingCheckbox").change(function () {
    if (!$(this).is(":checked")) {
      synth.cancel();
    }
  });

  setTimeout(function () {
    appendMessage(welcomeMessage, false);
  }, 500);
});
